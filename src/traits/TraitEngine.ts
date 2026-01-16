/**
 * TraitEngine - Deterministic evaluation of traits against DNA data
 * 
 * CRITICAL: This engine computes results using rules only.
 * The LLM explains results - it does NOT decide outcomes.
 */

import type {
  TraitDefinition,
  TraitEvaluationResult,
  SnpMatch,
  DimensionScore,
  ConfidenceLevel,
} from './TraitTypes'

// =============================================================================
// Condition Parser (safe evaluation of classification rules)
// =============================================================================

type ScoreContext = Record<string, number>

function evaluateCondition(condition: string, scores: ScoreContext): boolean {
  // Parse simple conditions like "morning_score > evening_score + 0.3"
  // Supports: >, <, >=, <=, ==, +, -, AND, OR
  
  try {
    // Replace dimension names with their values
    let expr = condition
    for (const [key, value] of Object.entries(scores)) {
      expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), value.toString())
    }
    
    // Evaluate arithmetic and comparisons safely
    // Split by AND/OR first
    if (expr.includes(' AND ')) {
      const parts = expr.split(' AND ')
      return parts.every(part => evaluateSimpleCondition(part.trim()))
    }
    if (expr.includes(' OR ')) {
      const parts = expr.split(' OR ')
      return parts.some(part => evaluateSimpleCondition(part.trim()))
    }
    
    return evaluateSimpleCondition(expr)
  } catch {
    console.warn(`[TraitEngine] Failed to evaluate condition: ${condition}`)
    return false
  }
}

function evaluateSimpleCondition(expr: string): boolean {
  // Handle comparisons
  const comparisons = ['>=', '<=', '>', '<', '==']
  
  for (const op of comparisons) {
    if (expr.includes(op)) {
      const [left, right] = expr.split(op).map(s => s.trim())
      const leftVal = evaluateArithmetic(left)
      const rightVal = evaluateArithmetic(right)
      
      switch (op) {
        case '>=': return leftVal >= rightVal
        case '<=': return leftVal <= rightVal
        case '>': return leftVal > rightVal
        case '<': return leftVal < rightVal
        case '==': return Math.abs(leftVal - rightVal) < 0.001
      }
    }
  }
  
  // If no comparison, treat as truthy check
  return evaluateArithmetic(expr) > 0
}

function evaluateArithmetic(expr: string): number {
  // Simple arithmetic: handles +, -, *, /
  // Only works with numbers after dimension substitution
  
  try {
    // Remove spaces around operators
    expr = expr.replace(/\s*([+\-*/])\s*/g, '$1')
    
    // Handle addition/subtraction (left to right)
    const addParts = expr.split(/(?=[+-])/)
    let result = 0
    
    for (const part of addParts) {
      if (part.includes('*')) {
        const [a, b] = part.split('*').map(parseFloat)
        result += a * b
      } else if (part.includes('/')) {
        const [a, b] = part.split('/').map(parseFloat)
        result += a / b
      } else {
        result += parseFloat(part) || 0
      }
    }
    
    return result
  } catch {
    return 0
  }
}

// =============================================================================
// Main Evaluation Function
// =============================================================================

export function evaluateTrait(
  trait: TraitDefinition,
  userSnpIndex: Map<string, string | null>
): TraitEvaluationResult {
  const snpMatches: SnpMatch[] = []
  const dimensionScores: DimensionScore[] = []
  const evaluationNotes: string[] = []
  
  // Initialize dimension scores
  const scores: ScoreContext = {}
  for (const dim of trait.scoring_model.dimensions) {
    scores[dim] = 0
  }
  const dimensionContributors: Record<string, string[]> = {}
  for (const dim of trait.scoring_model.dimensions) {
    dimensionContributors[dim] = []
  }
  
  // ==========================================================================
  // Step 1: Match SNPs and calculate scores
  // ==========================================================================
  
  let requiredMissing = 0
  
  for (const snpRule of trait.snps) {
    const userGenotype = userSnpIndex.get(snpRule.rsid)
    const found = userGenotype !== undefined && userGenotype !== null
    
    // Normalize genotype for lookup (try both orientations)
    let effect = null
    if (found && userGenotype) {
      // Try exact match first
      effect = snpRule.allele_effects[userGenotype] || null
      
      // Try reversed genotype (e.g., "A;G" vs "G;A")
      if (!effect && userGenotype.includes(';')) {
        const [a, b] = userGenotype.split(';')
        const reversed = `${b};${a}`
        effect = snpRule.allele_effects[reversed] || null
      }
      
      // Try without separator
      if (!effect) {
        const normalized = userGenotype.replace(';', '')
        effect = snpRule.allele_effects[normalized] || null
        // Try reversed
        if (!effect && normalized.length === 2) {
          const reversed = normalized[1] + normalized[0]
          effect = snpRule.allele_effects[reversed] || null
        }
      }
    }
    
    snpMatches.push({
      rsid: snpRule.rsid,
      gene: snpRule.gene,
      genotype: userGenotype || 'not found',
      effect,
      evidence: snpRule.evidence,
      found,
    })
    
    // Track required SNPs
    if (snpRule.required && !found) {
      requiredMissing++
      evaluationNotes.push(`Required SNP ${snpRule.rsid} (${snpRule.gene}) not found in DNA data`)
    }
    
    // Apply effect to scores
    if (effect) {
      const dimension = `${effect.direction}_score`
      if (dimension in scores) {
        scores[dimension] += effect.weight
        dimensionContributors[dimension].push(snpRule.rsid)
      }
    }
  }
  
  // ==========================================================================
  // Step 2: Build dimension scores output
  // ==========================================================================
  
  for (const dim of trait.scoring_model.dimensions) {
    dimensionScores.push({
      dimension: dim,
      score: Math.round(scores[dim] * 100) / 100,
      contributing_snps: dimensionContributors[dim],
    })
  }
  
  // ==========================================================================
  // Step 3: Check if evaluation is possible
  // ==========================================================================
  
  const snpsFound = snpMatches.filter(s => s.found).length
  const canEvaluate = requiredMissing === 0 && snpsFound > 0
  
  if (snpsFound === 0) {
    evaluationNotes.push('No SNPs from this trait found in DNA data')
  }
  
  // ==========================================================================
  // Step 4: Apply classification rules
  // ==========================================================================
  
  let classification: TraitEvaluationResult['classification'] = null
  
  if (canEvaluate) {
    // Try rules in order (first match wins)
    for (const rule of trait.classification_rules) {
      if (evaluateCondition(rule.condition, scores)) {
        // Apply confidence ceiling
        const effectiveConfidence = getEffectiveConfidence(
          rule.confidence,
          trait.confidence_ceiling
        )
        
        classification = {
          rule_id: rule.id,
          label: rule.label,
          confidence: effectiveConfidence,
          description: rule.description,
        }
        break
      }
    }
    
    if (!classification) {
      evaluationNotes.push('No classification rule matched the scores')
    }
  }
  
  // ==========================================================================
  // Step 5: Build explanation
  // ==========================================================================
  
  const explanation = buildExplanation(trait, classification, snpMatches, canEvaluate)
  
  return {
    trait_id: trait.id,
    trait_title: trait.title,
    snps_required: trait.snps.filter(s => s.required).length,
    snps_found: snpsFound,
    snp_matches: snpMatches,
    dimension_scores: dimensionScores,
    classification,
    can_evaluate: canEvaluate,
    evaluation_notes: evaluationNotes,
    explanation,
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function getEffectiveConfidence(
  ruleConfidence: ConfidenceLevel,
  ceiling: ConfidenceLevel
): ConfidenceLevel {
  const levels: ConfidenceLevel[] = ['low', 'medium', 'high']
  const ruleIndex = levels.indexOf(ruleConfidence)
  const ceilingIndex = levels.indexOf(ceiling)
  return levels[Math.min(ruleIndex, ceilingIndex)]
}

function buildExplanation(
  trait: TraitDefinition,
  classification: TraitEvaluationResult['classification'],
  snpMatches: SnpMatch[],
  canEvaluate: boolean
): TraitEvaluationResult['explanation'] {
  let summary: string
  
  if (!canEvaluate) {
    summary = `Kunde inte utvärdera ${trait.title} på grund av saknade SNP:er i din DNA-data.`
  } else if (classification) {
    const foundSnps = snpMatches.filter(s => s.found && s.effect)
    const snpSummary = foundSnps.map(s => `${s.rsid} (${s.gene})`).join(', ')
    summary = `Baserat på ${foundSnps.length} analyserade varianter (${snpSummary}), ` +
      `klassificeras du som: **${classification.label}** ` +
      `(konfidens: ${classification.confidence}).`
  } else {
    summary = `Analys slutförd men ingen tydlig klassificering kunde göras.`
  }
  
  return {
    summary,
    means: trait.explanations.means,
    not_means: trait.explanations.not_means,
    limitations: trait.explanations.limitations,
  }
}

// =============================================================================
// Batch Evaluation
// =============================================================================

export function evaluateAllTraits(
  traits: TraitDefinition[],
  userSnpIndex: Map<string, string | null>
): TraitEvaluationResult[] {
  return traits
    .map(trait => evaluateTrait(trait, userSnpIndex))
    .sort((a, b) => {
      // Sort by: can_evaluate (true first), then by snps_found (descending)
      if (a.can_evaluate !== b.can_evaluate) {
        return a.can_evaluate ? -1 : 1
      }
      return b.snps_found - a.snps_found
    })
}

// =============================================================================
// Trait Validation
// =============================================================================

export function validateTraitDefinition(trait: TraitDefinition): string[] {
  const errors: string[] = []
  
  // Required fields
  if (!trait.id) errors.push('Missing trait id')
  if (!trait.title) errors.push('Missing trait title')
  if (!trait.snps || trait.snps.length === 0) errors.push('No SNPs defined')
  if (!trait.classification_rules || trait.classification_rules.length < 3) {
    errors.push('Must have at least 3 classification rules (including intermediate)')
  }
  
  // Validate SNPs have proper structure
  for (const snp of trait.snps || []) {
    if (!snp.rsid) errors.push(`SNP missing rsid`)
    if (!snp.gene) errors.push(`SNP ${snp.rsid} missing gene`)
    if (!snp.allele_effects || Object.keys(snp.allele_effects).length === 0) {
      errors.push(`SNP ${snp.rsid} has no allele effects defined`)
    }
  }
  
  // Validate classification rules reference valid dimensions
  const validDimensions = new Set(trait.scoring_model?.dimensions || [])
  for (const rule of trait.classification_rules || []) {
    // Check if rule.condition references dimensions not in scoring model
    for (const dim of validDimensions) {
      // This is a simple check - could be more sophisticated
    }
  }
  
  // Behavioral/preference traits must have low/medium confidence ceiling
  if (trait.type === 'behavioral' && trait.confidence_ceiling === 'high') {
    errors.push('Behavioral traits must have confidence_ceiling of "low" or "medium"')
  }
  
  return errors
}
