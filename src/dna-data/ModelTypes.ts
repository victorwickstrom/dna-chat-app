/**
 * Strict TypeScript types for the DNA Data Integration Layer
 * NO `any` types allowed - all structures are explicitly typed
 */

// =============================================================================
// Domain Types
// =============================================================================

export type ModelDomain = 'drug' | 'gene' | 'trait' | 'guideline' | 'variant';

export type EvidenceLevel = 'high' | 'medium' | 'low' | 'unknown';

export type RiskClass = 'conditional' | 'probabilistic' | 'informational';

export type SignalStrength = 'strong' | 'moderate' | 'weak' | 'neutral';

// =============================================================================
// SNP Entry (for legacy model format)
// =============================================================================

export interface SNPEntry {
  rsid: string;
  riskAllele: string;
  weight: number;
}

// =============================================================================
// Interpretation Block (for legacy model format)
// =============================================================================

export interface InterpretationBlock {
  low: string;
  medium: string;
  high: string;
}

// =============================================================================
// Evidence Reference
// =============================================================================

export interface EvidenceReference {
  source: string;
  pubmed?: string;
  url?: string;
}

// =============================================================================
// Genetic Model (unified structure for all model types)
// =============================================================================

export interface GeneticModel {
  id: string;
  domain: ModelDomain;
  
  // Core identifiers
  gene: string | null;
  drug: string | null;
  rsid: string | null;
  
  // Clinical data
  phenotype: string | null;
  effect: string | null;
  evidence_level: EvidenceLevel | string;
  
  // Statistical data (hidden from AI output)
  odds_ratio: number | null;
  pvalue: number | null;
  confidence_interval: string | null;
  
  // Metadata
  source: string;
  source_url: string | null;
  last_updated: string;
  references: EvidenceReference[];
  
  // Legacy format fields (optional)
  category?: string;
  snps?: SNPEntry[];
  population?: string;
  interpretation?: InterpretationBlock;
  evidence?: EvidenceReference[];
  severity?: string;
  confidence?: string;
}

// =============================================================================
// Index Types
// =============================================================================

/**
 * Maps rsid -> array of model file paths
 * Example: { "rs1000113": ["trait/GWAS_2006.json"] }
 */
export interface RsidIndex {
  [rsid: string]: string[];
}

/**
 * Maps gene name -> array of model file paths
 * Example: { "ABCB1": ["gene/CPIC_gene_ABCB1_96.json", "variant/PharmGKB_CA_CA_PA267.json"] }
 */
export interface GeneIndex {
  [gene: string]: string[];
}

/**
 * Maps drug name -> array of model file paths
 * Example: { "abacavir": ["drug/CPIC_drug_abacavir_2.json"] }
 */
export interface DrugIndex {
  [drug: string]: string[];
}

/**
 * Maps domain -> array of model identifiers (without .json extension)
 * Example: { "drug": ["CPIC_drug_abacavir_2", ...], "trait": [...] }
 */
export interface DomainIndex {
  [domain: string]: string[];
}

// =============================================================================
// Metadata Types
// =============================================================================

export interface MetadataIndexes {
  domain: number;
  drug: number;
  gene: number;
  rsid: number;
}

export interface MetadataModels {
  by_domain: {
    drug: number;
    gene: number;
    guideline: number;
    trait: number;
    variant: number;
  };
  total: number;
}

export interface MetadataRunInfo {
  duration_seconds: number;
  end_time: string;
  start_time: string;
  platform: string;
  python_version: string;
}

export interface MetadataSource {
  errors: number;
  processed: number;
}

export interface MetadataSources {
  cpic: MetadataSource;
  gwas: MetadataSource;
  pharmgkb: MetadataSource;
}

export interface MetadataStatus {
  error_count: number;
  success: boolean;
  warning_count: number;
}

export interface Metadata {
  errors: string[] | null;
  indexes: MetadataIndexes;
  models: MetadataModels;
  run_info: MetadataRunInfo;
  sources: MetadataSources;
  status: MetadataStatus;
  version: string;
  warnings: string[] | null;
}

// =============================================================================
// Analysis Output Types (safe for AI consumption)
// =============================================================================

export interface Highlight {
  domain: ModelDomain;
  title: string;
  description: string;
  signalStrength: SignalStrength;
  relevantGenes: string[];
  relevantDrugs: string[];
  actionable: boolean;
}

export interface DomainSummary {
  matchCount: number;
  highlights: string[];
  signalStrength: SignalStrength;
  relevantGenes: string[];
  relevantDrugs: string[];
}

export interface AnalysisDomains {
  medication: DomainSummary;
  health: DomainSummary;
  traits: DomainSummary;
}

export interface AnalysisStats {
  matchedModels: number;
  matchedSnps: number;
  totalModelsScanned: number;
}

/**
 * The final output structure that is safe to send to AI/chat layer
 * Contains NO raw rsids, NO p-values, NO odds ratios
 */
export interface AnalysisSummary {
  domains: AnalysisDomains;
  highlights: Highlight[];
  modelSummaries: ModelSummary[];
  stats: AnalysisStats;
  generatedAt: string;
}

export interface ModelSummary {
  id: string;
  title: string;
  description: string;
  domain: ModelDomain;
  signalStrength: SignalStrength;
  riskClass: RiskClass;
  matchedSnps: number;
  genes: string[];
  drugs: string[];
  evidenceLevel: EvidenceLevel | string;
  score: number;
}

// =============================================================================
// Internal Processing Types
// =============================================================================

export interface ModelReference {
  domain: ModelDomain;
  filePath: string;
  modelId: string;
}

// =============================================================================
// Match Engine Types (Deterministic Matching)
// =============================================================================

/**
 * Trait-specific information derived directly from model
 */
export interface TraitInfo {
  traitName: string;
  numberOfSnpsInModel: number;
  numberOfMatchedSnps: number;
  genesInvolved: string[];
  evidenceLevel: string;
}

/**
 * Single match result – one per matched model
 * No aggregation, no filtering, deterministic
 */
export interface MatchResult {
  modelRef: string;
  category: 'trait' | 'drug' | 'gene' | 'guideline' | 'variant';
  title: string;

  matchedSnpsCount: number;
  matchedSnps: string[];

  weight: number;
  evidenceLevel: 'high' | 'medium' | 'low';
  riskClass: 'conditional' | 'probabilistic' | 'informational';

  totalScore: number;

  genes: string[];
  description: string;

  traitInfo?: TraitInfo;
}

/**
 * Final analysis result structure
 */
export interface AnalysisResult {
  stats: {
    totalRsids: number;
    matchedModels: number;
    matchedSnps: number;
  };

  matches: MatchResult[];
}

export interface RankedModel {
  model: GeneticModel;
  score: number;
  riskClass: RiskClass;
}

export interface LoadedIndexes {
  rsid: RsidIndex;
  gene: GeneIndex;
  drug: DrugIndex;
  domain: DomainIndex;
  metadata: Metadata;
}
