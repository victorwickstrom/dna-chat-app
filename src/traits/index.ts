/**
 * Trait Engine Module
 * 
 * Deterministic trait evaluation system for DNA analysis.
 * The LLM explains results computed by rules - it does NOT decide outcomes.
 */

// Types
export type {
  TraitCategory,
  TraitType,
  ConfidenceLevel,
  EvidenceStrength,
  AlleleEffect,
  SnpContribution,
  ScoringModel,
  ClassificationRule,
  TraitExplanations,
  TraitDefinition,
  SnpMatch,
  DimensionScore,
  TraitEvaluationResult,
  TraitRegistry as TraitRegistryType,
} from './TraitTypes'

// Engine
export { evaluateTrait, evaluateAllTraits, validateTraitDefinition } from './TraitEngine'

// Definitions
export {
  ALL_TRAITS,
  TRAIT_MAP,
  TRAIT_COMT_STRESS,
  TRAIT_MTHFR_FOLATE,
  TRAIT_CAFFEINE_METABOLISM,
  TRAIT_BDNF_NEUROPLASTICITY,
  TRAIT_ALCOHOL_FLUSH,
  TRAIT_LACTOSE_TOLERANCE,
  TRAIT_CHRONOTYPE,
} from './TraitDefinitions'

// Registry
export { TraitRegistry } from './TraitRegistry'

// Chat Gate
export {
  classifyQuestion,
  processQuestionThroughGate,
  generateGatedPromptSection,
  setActiveContext,
  getActiveContext,
  clearActiveContext,
  type GatedResponse,
} from './TraitChatGate'
