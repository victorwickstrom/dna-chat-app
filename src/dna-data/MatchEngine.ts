/**
 * MatchEngine - Deterministic DNA Matching
 *
 * Follows the functional spec exactly:
 * - Returns ALL matches (no filtering)
 * - Sorted by totalScore descending
 * - One MatchResult per matched model
 * - No AI, no aggregation, no neutralisation
 */

import type {
  GeneticModel,
  MatchResult,
  AnalysisResult,
  TraitInfo,
  EvidenceLevel,
  RiskClass,
  ModelDomain,
} from './ModelTypes';
import { IndexLoader } from './IndexLoader';
import { ModelLoader } from './ModelLoader';

// =============================================================================
// Score Helpers
// =============================================================================

function normalizeEvidenceLevel(level: string | undefined): 'high' | 'medium' | 'low' {
  const l = (level ?? '').toLowerCase();
  if (l === 'high' || l === '1a' || l === '1b') return 'high';
  if (l === 'medium' || l === '2a' || l === '2b') return 'medium';
  return 'low';
}

function normalizeRiskClass(model: GeneticModel): 'conditional' | 'probabilistic' | 'informational' {
  // Derive from domain or severity if available
  if (model.domain === 'drug' || model.domain === 'guideline') {
    return 'conditional';
  }
  if (model.severity === 'medical' || model.domain === 'variant') {
    return 'probabilistic';
  }
  return 'informational';
}

function evidenceScore(level: 'high' | 'medium' | 'low'): number {
  return level === 'high' ? 3 : level === 'medium' ? 2 : 1;
}

function riskScore(riskClass: 'conditional' | 'probabilistic' | 'informational'): number {
  return riskClass === 'conditional' ? 3 : riskClass === 'probabilistic' ? 2 : 1;
}

// =============================================================================
// Title / Description Helpers
// =============================================================================

function extractTitle(model: GeneticModel): string {
  if (model.phenotype) return model.phenotype;
  if (model.drug) return model.drug;
  if (model.gene) return model.gene;
  return model.id;
}

function extractDescription(model: GeneticModel): string {
  if (model.effect) return model.effect;
  if (model.interpretation?.medium) return model.interpretation.medium;
  return '';
}

function extractGenes(model: GeneticModel): string[] {
  const genes: string[] = [];
  if (model.gene) genes.push(model.gene);
  // Some models list genes in snps
  if (model.snps) {
    for (const snp of model.snps) {
      // snp may have gene field in some models
      const g = (snp as unknown as { gene?: string }).gene;
      if (g && !genes.includes(g)) genes.push(g);
    }
  }
  return genes;
}

// =============================================================================
// Core Matching
// =============================================================================

function computeMatchResult(
  model: GeneticModel,
  userRsidSet: Set<string>
): MatchResult {
  // Collect matched SNPs
  const snpsInModel = model.snps ?? [];
  const matchedSnpList: string[] = [];
  let weightSum = 0;

  // Check model-level rsid
  if (model.rsid && userRsidSet.has(model.rsid.toLowerCase())) {
    matchedSnpList.push(model.rsid.toLowerCase());
    weightSum += 1; // default weight
  }

  // Check snps array
  for (const snp of snpsInModel) {
    const rsidLower = snp.rsid.toLowerCase();
    if (userRsidSet.has(rsidLower) && !matchedSnpList.includes(rsidLower)) {
      matchedSnpList.push(rsidLower);
      weightSum += snp.weight ?? 1;
    }
  }

  const evidenceLevelNorm = normalizeEvidenceLevel(model.evidence_level);
  const riskClassNorm = normalizeRiskClass(model);

  const total =
    weightSum * evidenceScore(evidenceLevelNorm) * riskScore(riskClassNorm);

  const category = model.domain as MatchResult['category'];

  const result: MatchResult = {
    modelRef: `${model.domain}:${model.id}`,
    category,
    title: extractTitle(model),

    matchedSnpsCount: matchedSnpList.length,
    matchedSnps: matchedSnpList,

    weight: weightSum,
    evidenceLevel: evidenceLevelNorm,
    riskClass: riskClassNorm,

    totalScore: total,

    genes: extractGenes(model),
    description: extractDescription(model),
  };

  // Trait-specific info
  if (category === 'trait') {
    result.traitInfo = {
      traitName: extractTitle(model),
      numberOfSnpsInModel: snpsInModel.length + (model.rsid ? 1 : 0),
      numberOfMatchedSnps: matchedSnpList.length,
      genesInvolved: extractGenes(model),
      evidenceLevel: model.evidence_level ?? 'unknown',
    };
  }

  return result;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Extended result that includes loaded models for downstream use
 */
export interface MatchEngineResult {
  analysisResult: AnalysisResult;
  loadedModels: GeneticModel[];
}

/**
 * Run deterministic matching against user rsids
 * Returns ALL matches sorted by totalScore descending
 * Also returns loaded models for trait aggregation
 */
export async function runMatchEngine(userRsids: string[]): Promise<MatchEngineResult> {
  // Normalise user rsids to lowercase for matching
  const userRsidSet = new Set(userRsids.map((r) => r.toLowerCase()));

  // Step 1: Resolve rsids to model paths via index
  const modelPaths = IndexLoader.getModelsForRsids(userRsids);

  if (modelPaths.length === 0) {
    return {
      analysisResult: {
        stats: { totalRsids: userRsids.length, matchedModels: 0, matchedSnps: 0 },
        matches: [],
      },
      loadedModels: [],
    };
  }

  // Step 2: Load models (batched to avoid ERR_INSUFFICIENT_RESOURCES)
  const models = await ModelLoader.loadModels(modelPaths);

  // Step 3: Build MatchResult per model
  const matches: MatchResult[] = [];
  const allMatchedSnps = new Set<string>();

  for (const model of models) {
    const mr = computeMatchResult(model, userRsidSet);
    if (mr.matchedSnpsCount > 0) {
      matches.push(mr);
      for (const s of mr.matchedSnps) allMatchedSnps.add(s);
    }
  }

  // Step 4: Sort by totalScore descending
  matches.sort((a, b) => b.totalScore - a.totalScore);

  return {
    analysisResult: {
      stats: {
        totalRsids: userRsids.length,
        matchedModels: matches.length,
        matchedSnps: allMatchedSnps.size,
      },
      matches,
    },
    loadedModels: models,
  };
}
