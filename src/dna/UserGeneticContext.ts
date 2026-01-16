/**
 * UserGeneticContext - Persistent memory layer for DNA chat
 * 
 * This module maintains a personal genetic context model that:
 * - Stores known SNPs with interpretations
 * - Tracks confirmed traits and ruled-out conditions
 * - Remembers discussed topics
 * - Provides context summaries for LLM prompts
 */

import type { SnpMatch, SnpMatchResult } from '../dna-analysis/SnpMatcher'
import type { EnrichedSnp } from '../dna-analysis/SnpEnrichmentApi'

// =============================================================================
// Types
// =============================================================================

export interface KnownSnp {
  rsid: string
  genotype: string
  gene: string | null
  category: 'Good' | 'Bad' | null
  description: string | null
  weight: number
  riskLevel: 'low' | 'moderate' | 'elevated' | 'high'
  aiExplanation?: string
}

export interface TraitEvidence {
  type: 'snp' | 'symptom' | 'comorbidity' | 'user_reported'
  source: string
  strength: 'weak' | 'moderate' | 'strong'
  description: string
}

export interface ConfirmedTrait {
  name: string
  category: 'metabolism' | 'disease_risk' | 'physical_trait' | 'sensitivity' | 'carrier'
  confidence: 'low' | 'medium' | 'high'
  evidence: TraitEvidence[]
  relatedSnps: string[]
  addedAt: number
  lastUpdated: number
}

export interface RuledOutCondition {
  name: string
  reason: string
  ruledOutAt: number
}

export interface AskedTopic {
  topic: string
  askedAt: number
  summary?: string
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

export interface UserGeneticContext {
  // Unique identifier for the DNA file
  dnaHash: string | null
  uploadedAt: number | null
  
  // SNP data
  totalSnpsAnalyzed: number
  knownSnps: KnownSnp[]
  riskSnps: KnownSnp[]
  
  // Trait model
  confirmedTraits: ConfirmedTrait[]
  ruledOut: RuledOutCondition[]
  
  // Conversation memory
  askedTopics: AskedTopic[]
  conversationHistory: ConversationMessage[]
  
  // User-reported information
  userReportedSymptoms: string[]
  userReportedConditions: string[]
}

// =============================================================================
// State
// =============================================================================

const STORAGE_KEY = 'dna_user_context'

export const userContext: UserGeneticContext = {
  dnaHash: null,
  uploadedAt: null,
  totalSnpsAnalyzed: 0,
  knownSnps: [],
  riskSnps: [],
  confirmedTraits: [],
  ruledOut: [],
  askedTopics: [],
  conversationHistory: [],
  userReportedSymptoms: [],
  userReportedConditions: [],
}

// =============================================================================
// Initialization & Persistence
// =============================================================================

export function loadUserContext(): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<UserGeneticContext>
      Object.assign(userContext, parsed)
      console.log('[UserContext] Loaded from storage:', {
        dnaHash: userContext.dnaHash,
        knownSnps: userContext.knownSnps.length,
        traits: userContext.confirmedTraits.length,
        topics: userContext.askedTopics.length,
      })
    }
  } catch (e) {
    console.warn('[UserContext] Failed to load from storage:', e)
  }
}

export function saveUserContext(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userContext))
  } catch (e) {
    console.warn('[UserContext] Failed to save to storage:', e)
  }
}

export function resetUserContext(): void {
  userContext.dnaHash = null
  userContext.uploadedAt = null
  userContext.totalSnpsAnalyzed = 0
  userContext.knownSnps = []
  userContext.riskSnps = []
  userContext.confirmedTraits = []
  userContext.ruledOut = []
  userContext.askedTopics = []
  userContext.conversationHistory = []
  userContext.userReportedSymptoms = []
  userContext.userReportedConditions = []
  saveUserContext()
}

// =============================================================================
// Population from DNA Analysis
// =============================================================================

function hashDnaData(rsids: string[]): string {
  // Simple hash based on first/last rsids and count
  const sample = `${rsids.length}-${rsids[0] || ''}-${rsids[rsids.length - 1] || ''}`
  let hash = 0
  for (let i = 0; i < sample.length; i++) {
    const char = sample.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16)
}

function determineRiskLevel(snp: SnpMatch): 'low' | 'moderate' | 'elevated' | 'high' {
  if (snp.category === 'Good') return 'low'
  if (snp.weight >= 4) return 'high'
  if (snp.weight >= 3) return 'elevated'
  if (snp.weight >= 2) return 'moderate'
  return 'low'
}

export function populateFromSnpResult(
  rsids: string[],
  result: SnpMatchResult,
  enrichedSnps: EnrichedSnp[] = []
): void {
  const newHash = hashDnaData(rsids)
  
  // Check if this is a new DNA file
  if (userContext.dnaHash !== newHash) {
    console.log('[UserContext] New DNA detected, resetting context')
    resetUserContext()
    userContext.dnaHash = newHash
    userContext.uploadedAt = Date.now()
  }
  
  userContext.totalSnpsAnalyzed = result.matchedCount
  
  // Build enrichment lookup
  const enrichmentMap = new Map<string, EnrichedSnp>()
  for (const e of enrichedSnps) {
    enrichmentMap.set(e.rsid, e)
  }
  
  // Process all significant findings
  userContext.knownSnps = result.significantFindings.map((snp): KnownSnp => {
    const enriched = enrichmentMap.get(snp.rsid)
    return {
      rsid: snp.rsid,
      genotype: snp.genotype,
      gene: snp.gene || null,
      category: snp.category as 'Good' | 'Bad' | null,
      description: snp.description || null,
      weight: snp.weight,
      riskLevel: determineRiskLevel(snp),
      aiExplanation: enriched?.aiExplanation,
    }
  })
  
  // Extract risk SNPs specifically
  userContext.riskSnps = userContext.knownSnps.filter(s => s.category === 'Bad')
  
  // Auto-generate traits from SNP patterns
  generateTraitsFromSnps()
  
  saveUserContext()
  console.log('[UserContext] Populated from SNP result:', {
    total: userContext.totalSnpsAnalyzed,
    known: userContext.knownSnps.length,
    risk: userContext.riskSnps.length,
    traits: userContext.confirmedTraits.length,
  })
}

// =============================================================================
// Trait Generation
// =============================================================================

interface TraitPattern {
  name: string
  category: ConfirmedTrait['category']
  requiredGenes?: string[]
  requiredRsids?: string[]
  minRiskSnps?: number
  keywords?: string[]
}

const TRAIT_PATTERNS: TraitPattern[] = [
  {
    name: 'HLA-DQ2/DQ8 bärare (Celiaki-risk)',
    category: 'carrier',
    requiredGenes: ['HLA-DQA1', 'HLA-DQB1'],
    keywords: ['celiac', 'gluten', 'coeliac'],
  },
  {
    name: 'TPMT reducerad aktivitet',
    category: 'metabolism',
    requiredGenes: ['TPMT'],
    keywords: ['thiopurine', 'tpmt'],
  },
  {
    name: 'CYP2D6 variant metabolism',
    category: 'metabolism',
    requiredGenes: ['CYP2D6'],
  },
  {
    name: 'CYP2C19 variant metabolism',
    category: 'metabolism',
    requiredGenes: ['CYP2C19'],
  },
  {
    name: 'MTHFR variant (folat-metabolism)',
    category: 'metabolism',
    requiredGenes: ['MTHFR'],
  },
  {
    name: 'Laktosintolerans-predisposition',
    category: 'sensitivity',
    requiredGenes: ['MCM6', 'LCT'],
    keywords: ['lactose', 'lactase'],
  },
  {
    name: 'Koffeinmetabolism (långsam)',
    category: 'metabolism',
    requiredGenes: ['CYP1A2'],
    keywords: ['caffeine'],
  },
]

function generateTraitsFromSnps(): void {
  const now = Date.now()
  const geneSet = new Set(userContext.riskSnps.map(s => s.gene).filter(Boolean))
  const allDescriptions = userContext.knownSnps.map(s => s.description?.toLowerCase() || '').join(' ')
  
  for (const pattern of TRAIT_PATTERNS) {
    // Check if we already have this trait
    if (userContext.confirmedTraits.some(t => t.name === pattern.name)) continue
    
    let matched = false
    const evidence: TraitEvidence[] = []
    const relatedSnps: string[] = []
    
    // Check required genes
    if (pattern.requiredGenes) {
      const matchedGenes = pattern.requiredGenes.filter(g => geneSet.has(g))
      if (matchedGenes.length > 0) {
        matched = true
        for (const gene of matchedGenes) {
          const snps = userContext.riskSnps.filter(s => s.gene === gene)
          for (const snp of snps) {
            relatedSnps.push(snp.rsid)
            evidence.push({
              type: 'snp',
              source: `${snp.rsid} (${snp.genotype})`,
              strength: snp.weight >= 3 ? 'strong' : snp.weight >= 2 ? 'moderate' : 'weak',
              description: snp.description || `${gene} variant`,
            })
          }
        }
      }
    }
    
    // Check keywords in descriptions
    if (pattern.keywords && !matched) {
      for (const kw of pattern.keywords) {
        if (allDescriptions.includes(kw)) {
          matched = true
          const relevantSnps = userContext.knownSnps.filter(
            s => s.description?.toLowerCase().includes(kw)
          )
          for (const snp of relevantSnps) {
            if (!relatedSnps.includes(snp.rsid)) {
              relatedSnps.push(snp.rsid)
              evidence.push({
                type: 'snp',
                source: snp.rsid,
                strength: 'moderate',
                description: snp.description || kw,
              })
            }
          }
        }
      }
    }
    
    if (matched && evidence.length > 0) {
      userContext.confirmedTraits.push({
        name: pattern.name,
        category: pattern.category,
        confidence: evidence.length >= 3 ? 'high' : evidence.length >= 2 ? 'medium' : 'low',
        evidence,
        relatedSnps,
        addedAt: now,
        lastUpdated: now,
      })
    }
  }
}

// =============================================================================
// Conversation Memory
// =============================================================================

export function addConversationMessage(
  role: 'user' | 'assistant' | 'system',
  content: string
): void {
  userContext.conversationHistory.push({
    role,
    content,
    timestamp: Date.now(),
  })
  
  // Extract topics from user messages
  if (role === 'user') {
    extractTopicsFromMessage(content)
  }
  
  // Keep only last 50 messages for memory efficiency
  if (userContext.conversationHistory.length > 50) {
    userContext.conversationHistory = userContext.conversationHistory.slice(-50)
  }
  
  saveUserContext()
}

function extractTopicsFromMessage(message: string): void {
  const lowerMsg = message.toLowerCase()
  const topicKeywords: Record<string, string> = {
    'gluten': 'gluten och celiaki',
    'celiac': 'gluten och celiaki',
    'celiaki': 'gluten och celiaki',
    'laktos': 'laktosintolerans',
    'lactose': 'laktosintolerans',
    'tpmt': 'TPMT och läkemedelsmetabolism',
    'leukemi': 'leukemi och cancerrisker',
    'aml': 'leukemi och cancerrisker',
    'cancer': 'cancerrisker',
    'hud': 'hudrelaterade tillstånd',
    'skin': 'hudrelaterade tillstånd',
    'psoriasis': 'psoriasis',
    'hjärta': 'hjärt-kärlsjukdomar',
    'heart': 'hjärt-kärlsjukdomar',
    'diabetes': 'diabetes',
    'alzheimer': 'Alzheimers sjukdom',
    'parkinson': 'Parkinsons sjukdom',
  }
  
  for (const [keyword, topic] of Object.entries(topicKeywords)) {
    if (lowerMsg.includes(keyword)) {
      if (!userContext.askedTopics.some(t => t.topic === topic)) {
        userContext.askedTopics.push({
          topic,
          askedAt: Date.now(),
        })
      }
    }
  }
}

export function addUserReportedSymptom(symptom: string): void {
  if (!userContext.userReportedSymptoms.includes(symptom)) {
    userContext.userReportedSymptoms.push(symptom)
    saveUserContext()
  }
}

export function addRuledOutCondition(name: string, reason: string): void {
  if (!userContext.ruledOut.some(r => r.name === name)) {
    userContext.ruledOut.push({
      name,
      reason,
      ruledOutAt: Date.now(),
    })
    saveUserContext()
  }
}

// =============================================================================
// Context Summary for LLM
// =============================================================================

export function generateMemorySummary(): string {
  if (!userContext.dnaHash) {
    return 'Ingen DNA-data har laddats upp ännu.'
  }
  
  const sections: string[] = []
  
  // Header
  sections.push(`ANVÄNDARENS GENETISKA KONTEXT (uppdaterad ${new Date().toLocaleDateString('sv-SE')})`)
  sections.push(`DNA-fil analyserad: ${userContext.totalSnpsAnalyzed} SNPs matchade`)
  sections.push('')
  
  // Risk SNPs summary
  if (userContext.riskSnps.length > 0) {
    sections.push('RISKVARIANTER PÅVISADE:')
    const topRisk = userContext.riskSnps
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 10)
    for (const snp of topRisk) {
      const gene = snp.gene ? ` (${snp.gene})` : ''
      const desc = snp.description ? ` - ${snp.description}` : ''
      sections.push(`- ${snp.rsid}${gene} ${snp.genotype}: ${snp.riskLevel} risk${desc}`)
    }
    if (userContext.riskSnps.length > 10) {
      sections.push(`  ...och ${userContext.riskSnps.length - 10} ytterligare riskvarianter`)
    }
    sections.push('')
  }
  
  // Confirmed traits
  if (userContext.confirmedTraits.length > 0) {
    sections.push('BEKRÄFTADE EGENSKAPER/PREDISPOSITIONER:')
    for (const trait of userContext.confirmedTraits) {
      const evidenceCount = trait.evidence.length
      sections.push(`- ${trait.name} (${trait.confidence} konfidens, ${evidenceCount} evidenskällor)`)
      if (trait.relatedSnps.length <= 3) {
        sections.push(`  Relaterade SNPs: ${trait.relatedSnps.join(', ')}`)
      }
    }
    sections.push('')
  }
  
  // Ruled out
  if (userContext.ruledOut.length > 0) {
    sections.push('UTESLUTNA TILLSTÅND:')
    for (const ruled of userContext.ruledOut) {
      sections.push(`- ${ruled.name}: ${ruled.reason}`)
    }
    sections.push('')
  }
  
  // User reported
  if (userContext.userReportedSymptoms.length > 0) {
    sections.push('ANVÄNDARRAPPORTERADE SYMTOM:')
    sections.push(`- ${userContext.userReportedSymptoms.join(', ')}`)
    sections.push('')
  }
  
  if (userContext.userReportedConditions.length > 0) {
    sections.push('ANVÄNDARRAPPORTERADE TILLSTÅND:')
    sections.push(`- ${userContext.userReportedConditions.join(', ')}`)
    sections.push('')
  }
  
  // Asked topics
  if (userContext.askedTopics.length > 0) {
    sections.push('TIDIGARE DISKUTERADE ÄMNEN:')
    sections.push(`- ${userContext.askedTopics.map(t => t.topic).join(', ')}`)
    sections.push('')
  }
  
  // Recent conversation context (last 5 exchanges)
  const recentMessages = userContext.conversationHistory.slice(-10)
  if (recentMessages.length > 0) {
    sections.push('SENASTE KONVERSATION:')
    for (const msg of recentMessages) {
      const role = msg.role === 'user' ? 'Användare' : msg.role === 'assistant' ? 'AI' : 'System'
      const preview = msg.content.length > 150 ? msg.content.slice(0, 150) + '...' : msg.content
      sections.push(`[${role}]: ${preview}`)
    }
  }
  
  return sections.join('\n')
}

export function getContextForLlm(): {
  memorySummary: string
  riskSnpList: string
  traitList: string
  hasContext: boolean
} {
  const hasContext = userContext.dnaHash !== null
  
  return {
    memorySummary: generateMemorySummary(),
    riskSnpList: userContext.riskSnps
      .map(s => `${s.rsid} (${s.gene || 'unknown'}) ${s.genotype}: ${s.description || 'no description'}`)
      .join('\n'),
    traitList: userContext.confirmedTraits
      .map(t => t.name)
      .join(', '),
    hasContext,
  }
}

// Initialize on module load
loadUserContext()
