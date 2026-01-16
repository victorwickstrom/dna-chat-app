/**
 * TraitTypes - Type definitions for the deterministic trait engine
 * 
 * Traits are reusable rule-based models that evaluate SNP data deterministically.
 * The LLM explains results - it does NOT decide outcomes.
 */

// =============================================================================
// Core Types
// =============================================================================

export type TraitCategory = 
  | 'behavioral'
  | 'metabolic'
  | 'pharmacogenetic'
  | 'physical'
  | 'risk'
  | 'sensitivity'

export type TraitType = 
  | 'behavioral'
  | 'metabolic'
  | 'risk'
  | 'pharmacogenetic'

export type ConfidenceLevel = 'low' | 'medium' | 'high'
export type EvidenceStrength = 'weak' | 'moderate' | 'strong'

// =============================================================================
// SNP Contribution Rules
// =============================================================================

export interface AlleleEffect {
  direction: string  // e.g., 'morning', 'evening', 'fast', 'slow', 'increased', 'decreased'
  weight: number     // contribution weight (0.0 - 1.0)
}

export interface SnpContribution {
  rsid: string
  gene: string
  allele_effects: Record<string, AlleleEffect>  // genotype -> effect
  evidence: EvidenceStrength
  required: boolean  // if true, trait cannot be evaluated without this SNP
}

// =============================================================================
// Scoring Model
// =============================================================================

export interface ScoringModel {
  dimensions: string[]  // e.g., ['morning_score', 'evening_score']
  aggregation: 'sum' | 'weighted_average' | 'max'
  threshold_difference?: number  // minimum difference for non-intermediate classification
}

// =============================================================================
// Classification Rules
// =============================================================================

export interface ClassificationRule {
  id: string
  condition: string  // boolean expression, e.g., "morning_score > evening_score + 0.3"
  label: string      // user-facing label
  confidence: ConfidenceLevel
  description: string
}

// =============================================================================
// Trait Definition
// =============================================================================

export interface TraitExplanations {
  means: string
  not_means: string
  limitations: string[]
}

export interface TraitDefinition {
  id: string
  category: TraitCategory
  type: TraitType
  title: string
  description: string
  confidence_ceiling: ConfidenceLevel  // maximum confidence this trait can achieve
  interest_weight: number  // 0.0 - 1.0, for prioritization
  
  snps: SnpContribution[]
  scoring_model: ScoringModel
  classification_rules: ClassificationRule[]
  explanations: TraitExplanations
  
  created_at: number
  version: string
}

// =============================================================================
// Evaluation Results
// =============================================================================

export interface SnpMatch {
  rsid: string
  gene: string
  genotype: string
  effect: AlleleEffect | null
  evidence: EvidenceStrength
  found: boolean
}

export interface DimensionScore {
  dimension: string
  score: number
  contributing_snps: string[]
}

export interface TraitEvaluationResult {
  trait_id: string
  trait_title: string
  
  // SNP matching
  snps_required: number
  snps_found: number
  snp_matches: SnpMatch[]
  
  // Scoring
  dimension_scores: DimensionScore[]
  
  // Classification
  classification: {
    rule_id: string
    label: string
    confidence: ConfidenceLevel
    description: string
  } | null
  
  // Evaluation metadata
  can_evaluate: boolean
  evaluation_notes: string[]
  
  // Explanations
  explanation: {
    summary: string
    means: string
    not_means: string
    limitations: string[]
  }
}

// =============================================================================
// Trait Registry
// =============================================================================

export interface TraitRegistry {
  traits: Map<string, TraitDefinition>
  version: string
  last_updated: number
}
