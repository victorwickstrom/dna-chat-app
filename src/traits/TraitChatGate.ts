/**
 * TraitChatGate - Enforces that LLM can ONLY explain computed results
 * 
 * CRITICAL ARCHITECTURE:
 * - If no trait_result exists → LLM cannot answer about genetics
 * - LLM can ONLY mention SNPs that are in the computed result
 * - All genetic questions MUST go through trait evaluation first
 * - LLM EXPLAINS results, it does NOT compute or infer them
 */

import { TraitRegistry } from './TraitRegistry'
import type { TraitDefinition, TraitEvaluationResult } from './TraitTypes'

// =============================================================================
// Active Context State
// =============================================================================

interface ActiveTraitContext {
  trait_id: string | null
  trait_result: TraitEvaluationResult | null
  available_snps: string[]
  timestamp: number
}

let activeContext: ActiveTraitContext = {
  trait_id: null,
  trait_result: null,
  available_snps: [],
  timestamp: 0,
}

// =============================================================================
// Question Classification
// =============================================================================

interface QuestionClassification {
  is_genetic_question: boolean
  detected_traits: string[]
  keywords: string[]
  requires_trait_result: boolean
}

const GENETIC_KEYWORDS = [
  // Swedish
  'gen', 'genetisk', 'dna', 'snp', 'variant', 'allel', 'mutation',
  'ärftlig', 'nedärvd', 'risk', 'tendens', 'predisposition',
  'morgon', 'kväll', 'sömn', 'dygnsrytm', 'chronotype',
  'kaffe', 'koffein', 'metabolism', 'läkemedel', 'medicin',
  'laktos', 'mjölk', 'folat', 'b-vitamin', 'mthfr',
  'stress', 'ångest', 'comt', 'warrior', 'worrier',
  'alkohol', 'flush', 'aldh',
  // English
  'gene', 'genetic', 'snp', 'variant', 'allele', 'mutation',
  'inherited', 'hereditary', 'risk', 'tendency', 'predisposition',
  'morning', 'evening', 'sleep', 'circadian', 'chronotype',
  'coffee', 'caffeine', 'metabolism', 'drug', 'medication',
  'lactose', 'milk', 'folate', 'b-vitamin',
  'stress', 'anxiety', 'alcohol', 'flush',
]

const TRAIT_KEYWORD_MAP: Record<string, string[]> = {
  'comt_stress_response': ['stress', 'comt', 'warrior', 'worrier', 'dopamin', 'ångest', 'anxiety'],
  'mthfr_folate_metabolism': ['folat', 'folate', 'mthfr', 'b-vitamin', 'homocystein', 'b12'],
  'caffeine_metabolism': ['kaffe', 'coffee', 'koffein', 'caffeine', 'cyp1a2'],
  'bdnf_neuroplasticity': ['bdnf', 'minne', 'memory', 'inlärning', 'learning', 'neuroplasticitet'],
  'alcohol_flush_response': ['alkohol', 'alcohol', 'flush', 'aldh', 'rodnad'],
  'lactose_tolerance': ['laktos', 'lactose', 'mjölk', 'milk', 'mejeri', 'dairy'],
  'chronotype': ['morgon', 'morning', 'kväll', 'evening', 'dygnsrytm', 'chronotype', 'sömn', 'sleep', 'clock'],
}

export function classifyQuestion(question: string): QuestionClassification {
  const lowerQuestion = question.toLowerCase()
  const words = lowerQuestion.split(/\s+/)
  
  // Check for genetic keywords
  const matchedKeywords = GENETIC_KEYWORDS.filter(kw => lowerQuestion.includes(kw))
  const isGeneticQuestion = matchedKeywords.length > 0
  
  // Detect which traits are relevant
  const detectedTraits: string[] = []
  for (const [traitId, keywords] of Object.entries(TRAIT_KEYWORD_MAP)) {
    if (keywords.some(kw => lowerQuestion.includes(kw))) {
      detectedTraits.push(traitId)
    }
  }
  
  return {
    is_genetic_question: isGeneticQuestion,
    detected_traits: detectedTraits,
    keywords: matchedKeywords,
    requires_trait_result: isGeneticQuestion && detectedTraits.length > 0,
  }
}

// =============================================================================
// Trait Result Gate
// =============================================================================

export interface GatedResponse {
  can_answer: boolean
  trait_result: TraitEvaluationResult | null
  available_snps: string[]
  gate_message: string | null
  active_trait_id: string | null
  mode: 'trait_result' | 'fallback' | 'non_genetic'  // NEW: indicates response mode
  fallback_context: string | null  // NEW: context for fallback mode
}

/**
 * Process a question through the trait gate.
 * 
 * NEW BEHAVIOR:
 * - If trait_result EXISTS → mode: 'trait_result' (LLM MUST use it)
 * - If NO trait_result but genetic question → mode: 'fallback' (LLM can answer with restrictions)
 * - If non-genetic question → mode: 'non_genetic' (normal chat)
 */
export function processQuestionThroughGate(
  question: string,
  userSnpIndex: Map<string, string | null> | null
): GatedResponse {
  const classification = classifyQuestion(question)
  
  // Non-genetic questions can pass through normally
  if (!classification.is_genetic_question) {
    return {
      can_answer: true,
      trait_result: null,
      available_snps: [],
      gate_message: null,
      active_trait_id: null,
      mode: 'non_genetic',
      fallback_context: null,
    }
  }
  
  // Check if this is a follow-up question (user asks about current context)
  const isFollowUp = isFollowUpQuestion(question)
  if (isFollowUp && activeContext.trait_result) {
    return {
      can_answer: true,
      trait_result: activeContext.trait_result,
      available_snps: activeContext.available_snps,
      gate_message: null,
      active_trait_id: activeContext.trait_id,
      mode: 'trait_result',
      fallback_context: null,
    }
  }
  
  // No DNA data loaded - allow fallback with general info
  if (!userSnpIndex || userSnpIndex.size === 0) {
    return {
      can_answer: true,
      trait_result: null,
      available_snps: [],
      gate_message: null,
      active_trait_id: null,
      mode: 'fallback',
      fallback_context: 'NO_DNA_DATA: Ingen DNA-data har laddats upp. Du kan ge generell genetisk information men INGA personliga SNP-baserade svar.',
    }
  }
  
  // Try to find and evaluate a matching trait
  if (classification.detected_traits.length > 0) {
    const primaryTraitId = classification.detected_traits[0]
    const traitResult = TraitRegistry.evaluateSingle(primaryTraitId, userSnpIndex)
    
    if (traitResult && traitResult.can_evaluate && traitResult.classification) {
      // SUCCESS: We have a valid trait result
      const availableSnps = traitResult.snp_matches
        .filter(s => s.found)
        .map(s => s.rsid)
      
      setActiveContext(primaryTraitId, traitResult, availableSnps)
      
      return {
        can_answer: true,
        trait_result: traitResult,
        available_snps: availableSnps,
        gate_message: null,
        active_trait_id: primaryTraitId,
        mode: 'trait_result',
        fallback_context: null,
      }
    }
    
    // Trait exists but cannot be evaluated - allow fallback
    if (traitResult && !traitResult.can_evaluate) {
      const missingNote = traitResult.evaluation_notes.join(' ')
      return {
        can_answer: true,
        trait_result: null,
        available_snps: [],
        gate_message: null,
        active_trait_id: null,
        mode: 'fallback',
        fallback_context: `TRAIT_MISSING_SNPS: Trait "${traitResult.trait_title}" finns men SNP:erna saknas i din DNA-data (${missingNote}). Du kan förklara vad traitet handlar om och vilka SNP:er som skulle behövas, men du kan INTE ge ett personligt resultat.`,
      }
    }
  }
  
  // No matching trait found - allow fallback for general genetic questions
  return {
    can_answer: true,
    trait_result: null,
    available_snps: [],
    gate_message: null,
    active_trait_id: null,
    mode: 'fallback',
    fallback_context: `NO_TRAIT_MODEL: Ingen trait-modell finns för denna fråga (${classification.keywords.join(', ')}). Du kan ge generell vetenskaplig information om ämnet, men du får INTE hitta på SNP:er eller ge personliga genetiska svar. Var tydlig med att du ger generell info, inte personlig analys.`,
  }
}

// =============================================================================
// Follow-up Detection
// =============================================================================

const FOLLOW_UP_PATTERNS = [
  /^(och|men|så|alltså|okej|ok|jaha|aha)/i,
  /^(vad|hur|varför).*(det|detta|den|dessa)/i,
  /^(berätta|förklara|utveckla).*(mer|vidare)/i,
  /tendens/i,
  /^(what|how|why).*(this|that|it)/i,
  /^(tell|explain).*(more|further)/i,
]

function isFollowUpQuestion(question: string): boolean {
  const trimmed = question.trim()
  
  // Short questions are likely follow-ups
  if (trimmed.split(/\s+/).length <= 5) {
    return true
  }
  
  // Check patterns
  return FOLLOW_UP_PATTERNS.some(pattern => pattern.test(trimmed))
}

// =============================================================================
// Context Management
// =============================================================================

export function setActiveContext(
  traitId: string,
  result: TraitEvaluationResult,
  snps: string[]
): void {
  activeContext = {
    trait_id: traitId,
    trait_result: result,
    available_snps: snps,
    timestamp: Date.now(),
  }
}

export function getActiveContext(): ActiveTraitContext {
  return { ...activeContext }
}

export function clearActiveContext(): void {
  activeContext = {
    trait_id: null,
    trait_result: null,
    available_snps: [],
    timestamp: 0,
  }
}

// =============================================================================
// Prompt Generation for Gated Response
// =============================================================================

export function generateGatedPromptSection(gated: GatedResponse, language: string = 'sv'): string {
  // Handle fallback mode - give instructions for restricted answering
  if (gated.mode === 'fallback' && gated.fallback_context) {
    const lines: string[] = []
    
    if (language === 'sv') {
      lines.push('═══════════════════════════════════════════════════════════════')
      lines.push('FALLBACK-LÄGE (INGET TRAIT-RESULTAT FINNS)')
      lines.push('═══════════════════════════════════════════════════════════════')
      lines.push('')
      lines.push(`Kontext: ${gated.fallback_context}`)
      lines.push('')
      lines.push('REGLER FÖR FALLBACK-SVAR:')
      lines.push('1. Du får ge GENERELL vetenskaplig information om ämnet')
      lines.push('2. Du får INTE hitta på SNP:er (rs-nummer)')
      lines.push('3. Du får INTE ge personliga genetiska svar')
      lines.push('4. Du MÅSTE vara tydlig med att detta är generell info, inte personlig analys')
      lines.push('5. Du kan nämna vilka gener/SNP:er som BRUKAR studeras för detta ämne')
      lines.push('6. Om användaren har DNA-data men saknar specifika SNP:er, förklara vilka som skulle behövas')
      lines.push('')
      lines.push('SVARSFORMAT:')
      lines.push('"Jag har ingen specifik genetisk analys för denna fråga, men här är vad forskningen säger generellt..."')
      lines.push('')
    } else {
      lines.push('═══════════════════════════════════════════════════════════════')
      lines.push('FALLBACK MODE (NO TRAIT RESULT EXISTS)')
      lines.push('═══════════════════════════════════════════════════════════════')
      lines.push('')
      lines.push(`Context: ${gated.fallback_context}`)
      lines.push('')
      lines.push('RULES FOR FALLBACK RESPONSE:')
      lines.push('1. You may give GENERAL scientific information about the topic')
      lines.push('2. You may NOT invent SNPs (rs-numbers)')
      lines.push('3. You may NOT give personal genetic answers')
      lines.push('4. You MUST be clear that this is general info, not personal analysis')
      lines.push('5. You may mention which genes/SNPs are TYPICALLY studied for this topic')
      lines.push('6. If user has DNA data but lacks specific SNPs, explain which ones would be needed')
      lines.push('')
      lines.push('RESPONSE FORMAT:')
      lines.push('"I don\'t have a specific genetic analysis for this question, but here is what research generally says..."')
      lines.push('')
    }
    
    return lines.join('\n')
  }
  
  // Non-genetic or no context needed
  if (gated.mode === 'non_genetic' || !gated.trait_result) {
    return ''
  }
  
  const result = gated.trait_result
  const c = result.classification!
  
  const lines: string[] = []
  
  if (language === 'sv') {
    lines.push('═══════════════════════════════════════════════════════════════')
    lines.push('BERÄKNAT TRAIT-RESULTAT (DU FÅR ENDAST FÖRKLARA DETTA)')
    lines.push('═══════════════════════════════════════════════════════════════')
    lines.push('')
    lines.push(`Trait: ${result.trait_title}`)
    lines.push(`Klassificering: ${c.label}`)
    lines.push(`Konfidens: ${c.confidence}`)
    lines.push(`Regel-ID: ${c.rule_id}`)
    lines.push('')
    lines.push('Använda SNP:er (ENDAST dessa får nämnas):')
    for (const snp of result.snp_matches.filter(s => s.found && s.effect)) {
      lines.push(`  - ${snp.rsid} (${snp.gene}): ${snp.genotype}`)
    }
    lines.push('')
    lines.push('Poäng:')
    for (const dim of result.dimension_scores) {
      lines.push(`  - ${dim.dimension}: ${dim.score}`)
    }
    lines.push('')
    lines.push(`Beskrivning: ${c.description}`)
    lines.push('')
    lines.push('═══════════════════════════════════════════════════════════════')
    lines.push('REGLER FÖR DITT SVAR:')
    lines.push('═══════════════════════════════════════════════════════════════')
    lines.push('1. Du får ENDAST förklara resultatet ovan')
    lines.push('2. Du får INTE nämna andra SNP:er än de listade')
    lines.push('3. Du får INTE ändra klassificeringen')
    lines.push('4. Du får INTE ge medicinsk rådgivning')
    lines.push('5. Du får INTE spekulera om andra genetiska tendenser')
    lines.push('6. Ditt svar MÅSTE börja med klassificeringen')
    lines.push('')
    lines.push('SVARSFORMAT:')
    lines.push(`"Baserat på din genetiska data klassificeras du som: **${c.label}**"`)
    lines.push(`"Konfidens: ${c.confidence}"`)
    lines.push(`"Baserat på: ${result.snp_matches.filter(s => s.found).length} SNP"`)
    lines.push('')
  } else {
    lines.push('═══════════════════════════════════════════════════════════════')
    lines.push('COMPUTED TRAIT RESULT (YOU MAY ONLY EXPLAIN THIS)')
    lines.push('═══════════════════════════════════════════════════════════════')
    lines.push('')
    lines.push(`Trait: ${result.trait_title}`)
    lines.push(`Classification: ${c.label}`)
    lines.push(`Confidence: ${c.confidence}`)
    lines.push(`Rule ID: ${c.rule_id}`)
    lines.push('')
    lines.push('Used SNPs (ONLY these may be mentioned):')
    for (const snp of result.snp_matches.filter(s => s.found && s.effect)) {
      lines.push(`  - ${snp.rsid} (${snp.gene}): ${snp.genotype}`)
    }
    lines.push('')
    lines.push('Scores:')
    for (const dim of result.dimension_scores) {
      lines.push(`  - ${dim.dimension}: ${dim.score}`)
    }
    lines.push('')
    lines.push(`Description: ${c.description}`)
    lines.push('')
    lines.push('═══════════════════════════════════════════════════════════════')
    lines.push('RULES FOR YOUR RESPONSE:')
    lines.push('═══════════════════════════════════════════════════════════════')
    lines.push('1. You may ONLY explain the result above')
    lines.push('2. You may NOT mention other SNPs than those listed')
    lines.push('3. You may NOT change the classification')
    lines.push('4. You may NOT give medical advice')
    lines.push('5. You may NOT speculate about other genetic tendencies')
    lines.push('6. Your response MUST start with the classification')
    lines.push('')
    lines.push('RESPONSE FORMAT:')
    lines.push(`"Based on your genetic data, you are classified as: **${c.label}**"`)
    lines.push(`"Confidence: ${c.confidence}"`)
    lines.push(`"Based on: ${result.snp_matches.filter(s => s.found).length} SNP(s)"`)
    lines.push('')
  }
  
  return lines.join('\n')
}
