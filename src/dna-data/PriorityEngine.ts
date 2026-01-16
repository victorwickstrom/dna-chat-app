/**
 * PriorityEngine - Implements model prioritization rules
 * 
 * Prioritization hierarchy:
 * 1. risk_class: conditional > probabilistic > informational
 * 2. evidence_level: high > medium > low > unknown
 * 3. domain: drug/gene models higher priority than traits
 * 4. Default max 5 models returned
 */

import type { GeneticModel, RiskClass, EvidenceLevel, RankedModel } from './ModelTypes';

const DEFAULT_MAX_MODELS = 5;

/**
 * Determine risk class from model properties
 */
function determineRiskClass(model: GeneticModel): RiskClass {
  // Drug interactions and gene-specific effects are conditional
  if (model.domain === 'drug' || model.domain === 'guideline') {
    return 'conditional';
  }
  
  // Gene models with known effects are conditional
  if (model.domain === 'gene' && model.effect) {
    return 'conditional';
  }
  
  // Variants with high evidence are probabilistic
  if (model.domain === 'variant') {
    return 'probabilistic';
  }
  
  // Traits with statistical significance are probabilistic
  if (model.domain === 'trait') {
    if (model.odds_ratio !== null && model.odds_ratio > 1.5) {
      return 'probabilistic';
    }
    if (model.pvalue !== null && model.pvalue < 1e-8) {
      return 'probabilistic';
    }
  }
  
  // Legacy models with high confidence
  if (model.confidence === 'high') {
    return 'probabilistic';
  }
  
  // Default to informational
  return 'informational';
}

/**
 * Get numeric score for risk class (higher = more important)
 */
function getRiskClassScore(riskClass: RiskClass): number {
  switch (riskClass) {
    case 'conditional':
      return 300;
    case 'probabilistic':
      return 200;
    case 'informational':
      return 100;
    default:
      return 0;
  }
}

/**
 * Normalize evidence level to standard format
 */
function normalizeEvidenceLevel(level: string): EvidenceLevel {
  const normalized = level.toLowerCase();
  if (normalized === 'high' || normalized === '1' || normalized === '1a' || normalized === '1b') {
    return 'high';
  }
  if (normalized === 'medium' || normalized === 'moderate' || normalized === '2' || normalized === '2a' || normalized === '2b') {
    return 'medium';
  }
  if (normalized === 'low' || normalized === '3' || normalized === '4') {
    return 'low';
  }
  return 'unknown';
}

/**
 * Get numeric score for evidence level (higher = more important)
 */
function getEvidenceLevelScore(model: GeneticModel): number {
  const level = normalizeEvidenceLevel(model.evidence_level);
  switch (level) {
    case 'high':
      return 40;
    case 'medium':
      return 30;
    case 'low':
      return 20;
    case 'unknown':
      return 10;
    default:
      return 0;
  }
}

/**
 * Get numeric score for domain (higher = more important)
 */
function getDomainScore(model: GeneticModel): number {
  switch (model.domain) {
    case 'drug':
      return 50;
    case 'guideline':
      return 45;
    case 'gene':
      return 40;
    case 'variant':
      return 30;
    case 'trait':
      return 20;
    default:
      return 10;
  }
}

/**
 * Get bonus score for actionable content
 */
function getActionabilityScore(model: GeneticModel): number {
  let score = 0;
  
  // Drug interactions are highly actionable
  if (model.drug) {
    score += 15;
  }
  
  // Gene-specific effects with guidelines
  if (model.domain === 'guideline') {
    score += 10;
  }
  
  // Models with interpretations are more useful
  if (model.interpretation || model.effect) {
    score += 5;
  }
  
  return score;
}

/**
 * Calculate total priority score for a model
 */
function calculateScore(model: GeneticModel): number {
  const riskClass = determineRiskClass(model);
  
  return (
    getRiskClassScore(riskClass) +
    getEvidenceLevelScore(model) +
    getDomainScore(model) +
    getActionabilityScore(model)
  );
}

/**
 * Rank models by priority score
 */
export function rankModels(
  models: GeneticModel[],
  maxModels: number = DEFAULT_MAX_MODELS
): GeneticModel[] {
  if (models.length === 0) {
    return [];
  }

  // Calculate scores and create ranked models
  const rankedModels: RankedModel[] = models.map((model) => ({
    model,
    score: calculateScore(model),
    riskClass: determineRiskClass(model),
  }));

  // Sort by score descending
  rankedModels.sort((a, b) => b.score - a.score);

  // Return top N models
  return rankedModels.slice(0, maxModels).map((rm) => rm.model);
}

/**
 * Rank models and return with scores for debugging/testing
 */
export function rankModelsWithScores(
  models: GeneticModel[],
  maxModels: number = DEFAULT_MAX_MODELS
): RankedModel[] {
  if (models.length === 0) {
    return [];
  }

  const rankedModels: RankedModel[] = models.map((model) => ({
    model,
    score: calculateScore(model),
    riskClass: determineRiskClass(model),
  }));

  rankedModels.sort((a, b) => b.score - a.score);

  return rankedModels.slice(0, maxModels);
}

/**
 * Filter models by minimum score threshold
 */
export function filterByMinScore(
  models: GeneticModel[],
  minScore: number
): GeneticModel[] {
  return models.filter((model) => calculateScore(model) >= minScore);
}

/**
 * Get models grouped by risk class
 */
export function groupByRiskClass(
  models: GeneticModel[]
): Map<RiskClass, GeneticModel[]> {
  const groups = new Map<RiskClass, GeneticModel[]>();
  
  for (const model of models) {
    const riskClass = determineRiskClass(model);
    const existing = groups.get(riskClass) || [];
    existing.push(model);
    groups.set(riskClass, existing);
  }
  
  return groups;
}

/**
 * Get conditional (actionable) models only
 */
export function getConditionalModels(models: GeneticModel[]): GeneticModel[] {
  return models.filter((model) => determineRiskClass(model) === 'conditional');
}

/**
 * Get models related to medications
 */
export function getMedicationModels(models: GeneticModel[]): GeneticModel[] {
  return models.filter(
    (model) => model.domain === 'drug' || model.domain === 'guideline' || model.drug !== null
  );
}

// Export utility functions for testing
export {
  determineRiskClass,
  calculateScore,
  normalizeEvidenceLevel,
  DEFAULT_MAX_MODELS,
};
