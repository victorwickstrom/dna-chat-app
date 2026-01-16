/**
 * Canonical SNP Record (CSR) Types
 * 
 * This is the ONLY format that AI ever sees for SNP knowledge.
 * Raw SNPedia text is NEVER sent to the LLM.
 * 
 * Benefits:
 * - 80-150 tokens vs 3000-8000 for raw HTML
 * - Deterministic, consistent answers
 * - No hallucinations possible
 * - Versioned and immutable
 */

// =============================================================================
// Core Types
// =============================================================================

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'uncertain'
export type EffectStrength = 'strong' | 'moderate' | 'weak' | 'unknown'

export interface AlleleEffect {
  /** Effect on the trait/phenotype */
  effect: string
  /** Associated traits or conditions */
  associated_traits: string[]
  /** How strong the evidence is */
  strength: EffectStrength
  /** Risk direction: increased, decreased, neutral */
  risk_direction?: 'increased' | 'decreased' | 'neutral'
  /** Frequency in population (if known) */
  population_frequency?: number
}

export interface CanonicalSNPRecord {
  /** The rsID (e.g., "rs12913832") */
  rsid: string
  /** Gene name if applicable */
  gene: string | null
  /** Chromosome location */
  chromosome?: string
  /** Position on chromosome */
  position?: number
  /** Brief functional description */
  functional_role: string
  /** Per-allele effects - key is the allele (A, G, C, T) */
  effects: Record<string, AlleleEffect>
  /** Primary phenotype domain (eye_color, metabolism, etc.) */
  phenotype_domain: string
  /** Overall confidence in this data */
  confidence: ConfidenceLevel
  /** Key notes for explanation (max 3, short) */
  notes: string[]
  /** Data source */
  source: 'SNPedia' | 'ClinVar' | 'manual' | 'other'
  /** Version timestamp (ISO string) */
  version: string
  /** When this record was fetched */
  fetched_at: number
  /** Token count estimate for this record */
  token_estimate?: number
}

// =============================================================================
// Storage Types
// =============================================================================

export interface CSRCache {
  /** Map of rsid -> CSR */
  records: Record<string, CanonicalSNPRecord>
  /** When the cache was last updated */
  last_updated: number
  /** Total number of records */
  count: number
  /** Version of the cache format */
  cache_version: string
}

export interface CSRFetchResult {
  success: boolean
  rsid: string
  record: CanonicalSNPRecord | null
  error?: string
  /** Was this from cache or freshly fetched? */
  source: 'cache' | 'fetched' | 'error'
}

// =============================================================================
// Query/Usage Types
// =============================================================================

export interface CSRQuery {
  rsids: string[]
  /** Only return records matching these domains */
  phenotype_domains?: string[]
  /** Minimum confidence level */
  min_confidence?: ConfidenceLevel
}

export interface CSRQueryResult {
  found: CanonicalSNPRecord[]
  missing: string[]
  /** Total tokens estimated for found records */
  total_tokens: number
}

// =============================================================================
// Compact Format for LLM (ultra low token)
// =============================================================================

export interface CompactSNPInfo {
  rsid: string
  gene: string | null
  effect: string
  confidence: string
}

export interface CompactTraitContext {
  trait: string
  result: string
  confidence: string
  based_on: CompactSNPInfo[]
  explanation_hints: string[]
}

/**
 * Convert a full CSR to compact format for LLM consumption
 * This is the ONLY thing AI sees
 */
export function toCompactFormat(csr: CanonicalSNPRecord, userAllele: string): CompactSNPInfo {
  const effect = csr.effects[userAllele]?.effect || csr.effects[userAllele.toUpperCase()]?.effect || 'unknown'
  
  return {
    rsid: csr.rsid,
    gene: csr.gene,
    effect: effect,
    confidence: csr.confidence,
  }
}

/**
 * Estimate token count for a CSR record
 */
export function estimateTokens(csr: CanonicalSNPRecord): number {
  // Rough estimate: ~4 chars per token
  const json = JSON.stringify(csr)
  return Math.ceil(json.length / 4)
}

// =============================================================================
// Phenotype Domains (standardized)
// =============================================================================

export const PHENOTYPE_DOMAINS = {
  // Physical traits
  eye_color: 'Ögonfärg',
  hair_color: 'Hårfärg',
  skin_pigmentation: 'Hudpigmentering',
  height: 'Längd',
  
  // Metabolism
  caffeine_metabolism: 'Koffeinmetabolism',
  alcohol_metabolism: 'Alkoholmetabolism',
  lactose_tolerance: 'Laktostolerans',
  folate_metabolism: 'Folatmetabolism',
  
  // Health risks
  cancer_risk: 'Cancerrisk',
  cardiovascular: 'Hjärt-kärl',
  diabetes_risk: 'Diabetesrisk',
  alzheimers_risk: 'Alzheimers risk',
  
  // Behavioral
  stress_response: 'Stressrespons',
  sleep_chronotype: 'Dygnsrytm',
  pain_sensitivity: 'Smärtkänslighet',
  
  // Nutrition
  vitamin_metabolism: 'Vitaminmetabolism',
  omega_fatty_acids: 'Omega-fettsyror',
  
  // Other
  drug_response: 'Läkemedelsrespons',
  immune_response: 'Immunrespons',
  other: 'Övrigt',
} as const

export type PhenotypeDomain = keyof typeof PHENOTYPE_DOMAINS
