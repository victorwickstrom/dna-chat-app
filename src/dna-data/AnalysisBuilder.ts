/**
 * AnalysisBuilder - Converts raw loaded models into safe, AI-consumable summaries
 * 
 * Rules:
 * - NO raw rsids in output
 * - NO p-values
 * - NO odds ratios
 * - Only signal strength + context
 */

import type {
  GeneticModel,
  AnalysisSummary,
  AnalysisDomains,
  DomainSummary,
  Highlight,
  SignalStrength,
  ModelDomain,
  ModelSummary,
} from './ModelTypes';
import { determineRiskClass, normalizeEvidenceLevel, calculateScore } from './PriorityEngine';

/**
 * Determine signal strength from model properties
 * Converts statistical measures to qualitative strength
 */
function determineSignalStrength(model: GeneticModel): SignalStrength {
  // High evidence = strong signal
  const evidenceLevel = normalizeEvidenceLevel(model.evidence_level);
  if (evidenceLevel === 'high') {
    return 'strong';
  }
  
  // Drug/guideline models are inherently strong signals
  if (model.domain === 'drug' || model.domain === 'guideline') {
    return 'strong';
  }
  
  // Medium evidence = moderate signal
  if (evidenceLevel === 'medium') {
    return 'moderate';
  }
  
  // Legacy models with high confidence
  if (model.confidence === 'high') {
    return 'strong';
  }
  if (model.confidence === 'moderate') {
    return 'moderate';
  }
  
  // Low evidence or unknown = weak
  if (evidenceLevel === 'low') {
    return 'weak';
  }
  
  return 'neutral';
}

/**
 * Extract a safe, human-readable title from a model
 */
function extractTitle(model: GeneticModel): string {
  // Try phenotype first
  if (model.phenotype && !model.phenotype.includes('rs')) {
    return cleanTitle(model.phenotype);
  }
  
  // Try effect description
  if (model.effect && model.effect.length < 100) {
    return cleanTitle(model.effect);
  }
  
  // Build from components
  if (model.drug && model.gene) {
    return `${model.drug} response (${model.gene})`;
  }
  if (model.drug) {
    return `${model.drug} response`;
  }
  if (model.gene) {
    return `${model.gene} variant`;
  }
  
  // Clean up model ID as fallback
  return cleanTitle(model.id);
}

/**
 * Clean and format a title string
 */
function cleanTitle(raw: string): string {
  return raw
    .replace(/_/g, ' ')
    .replace(/GWAS association for \w+/, '')
    .replace(/CPIC_drug_/g, '')
    .replace(/CPIC_gene_/g, '')
    .replace(/CPIC_GL_/g, '')
    .replace(/PharmGKB_/g, '')
    .replace(/GWAS_\d+/g, '')
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\s+/g, ' ')
    .trim()
    || 'Genetic variant';
}

/**
 * Generate a safe description without raw data
 */
function generateDescription(model: GeneticModel): string {
  const parts: string[] = [];
  
  // Add source context
  if (model.source) {
    parts.push(`Based on ${model.source} data.`);
  }
  
  // Add gene context
  if (model.gene) {
    parts.push(`Related to the ${model.gene} gene.`);
  }
  
  // Add drug context
  if (model.drug) {
    parts.push(`Affects ${model.drug} metabolism or response.`);
  }
  
  // Add interpretation if available (legacy format)
  if (model.interpretation) {
    parts.push('Personalized interpretation available.');
  }
  
  // Add effect summary if safe
  if (model.effect && model.effect.length < 200 && !model.effect.includes('rs')) {
    const cleanEffect = model.effect.replace(/<[^>]*>/g, '').trim();
    if (cleanEffect.length > 0 && cleanEffect.length < 150) {
      parts.push(cleanEffect);
    }
  }
  
  return parts.join(' ') || 'Genetic association identified.';
}

/**
 * Determine if a model is actionable (requires user attention)
 */
function isActionable(model: GeneticModel): boolean {
  // Drug interactions are always actionable
  if (model.domain === 'drug' || model.drug) {
    return true;
  }
  
  // Guidelines are actionable
  if (model.domain === 'guideline') {
    return true;
  }
  
  // Conditional risk class is actionable
  if (determineRiskClass(model) === 'conditional') {
    return true;
  }
  
  // High evidence variants
  if (normalizeEvidenceLevel(model.evidence_level) === 'high') {
    return true;
  }
  
  return false;
}

/**
 * Map model domain to analysis domain category
 */
function mapToAnalysisDomain(model: GeneticModel): keyof AnalysisDomains {
  if (model.domain === 'drug' || model.domain === 'guideline' || model.drug) {
    return 'medication';
  }
  if (model.domain === 'trait') {
    return 'traits';
  }
  return 'health';
}

/**
 * Create a highlight from a model
 */
function createHighlight(model: GeneticModel): Highlight {
  return {
    domain: model.domain,
    title: extractTitle(model),
    description: generateDescription(model),
    signalStrength: determineSignalStrength(model),
    relevantGenes: model.gene ? [model.gene] : [],
    relevantDrugs: model.drug ? [model.drug] : [],
    actionable: isActionable(model),
  };
}

/**
 * Aggregate signal strength from multiple models
 */
function aggregateSignalStrength(models: GeneticModel[]): SignalStrength {
  if (models.length === 0) return 'neutral';
  
  const strengths = models.map(determineSignalStrength);
  
  if (strengths.includes('strong')) return 'strong';
  if (strengths.includes('moderate')) return 'moderate';
  if (strengths.includes('weak')) return 'weak';
  return 'neutral';
}

/**
 * Extract unique genes from models
 */
function extractGenes(models: GeneticModel[]): string[] {
  const genes = new Set<string>();
  for (const model of models) {
    if (model.gene) {
      genes.add(model.gene);
    }
  }
  return Array.from(genes);
}

/**
 * Extract unique drugs from models
 */
function extractDrugs(models: GeneticModel[]): string[] {
  const drugs = new Set<string>();
  for (const model of models) {
    if (model.drug) {
      drugs.add(model.drug);
    }
  }
  return Array.from(drugs);
}

/**
 * Generate highlight strings for a domain
 */
function generateDomainHighlights(models: GeneticModel[], maxHighlights: number = 3): string[] {
  const highlights: string[] = [];
  
  for (const model of models.slice(0, maxHighlights)) {
    const title = extractTitle(model);
    if (title && !highlights.includes(title)) {
      highlights.push(title);
    }
  }
  
  return highlights;
}

/**
 * Create a domain summary from models
 */
function createDomainSummary(models: GeneticModel[]): DomainSummary {
  return {
    matchCount: models.length,
    highlights: generateDomainHighlights(models),
    signalStrength: aggregateSignalStrength(models),
    relevantGenes: extractGenes(models),
    relevantDrugs: extractDrugs(models),
  };
}

/**
 * Build a complete analysis summary from ranked models
 * This is the main entry point for creating safe AI output
 */
export function buildModelSummary(model: GeneticModel, userRsids: Set<string>): ModelSummary {
  const snps = model.snps ?? [];
  const normalizedSnps = new Set(snps.map((entry) => entry.rsid.toLowerCase()));
  let matchedSnps = 0;

  if (model.rsid) {
    if (userRsids.has(model.rsid.toLowerCase())) {
      matchedSnps += 1;
    }
  }

  for (const snp of normalizedSnps) {
    if (userRsids.has(snp)) {
      matchedSnps += 1;
    }
  }

  return {
    id: model.id,
    title: extractTitle(model),
    description: generateDescription(model),
    domain: model.domain,
    signalStrength: determineSignalStrength(model),
    riskClass: determineRiskClass(model),
    matchedSnps,
    genes: model.gene ? [model.gene] : [],
    drugs: model.drug ? [model.drug] : [],
    evidenceLevel: model.evidence_level,
    score: calculateScore(model),
  };
}

export function buildAnalysis(
  rankedModels: GeneticModel[],
  matchedSnpCount: number,
  totalScanned: number,
  userRsids: string[] = []
): AnalysisSummary {
  const userRsidSet = new Set(userRsids.map((rsid) => rsid.toLowerCase()));
  // Group models by analysis domain
  const medicationModels: GeneticModel[] = [];
  const healthModels: GeneticModel[] = [];
  const traitModels: GeneticModel[] = [];
  
  for (const model of rankedModels) {
    const domain = mapToAnalysisDomain(model);
    switch (domain) {
      case 'medication':
        medicationModels.push(model);
        break;
      case 'health':
        healthModels.push(model);
        break;
      case 'traits':
        traitModels.push(model);
        break;
    }
  }
  
  // Create domain summaries
  const domains: AnalysisDomains = {
    medication: createDomainSummary(medicationModels),
    health: createDomainSummary(healthModels),
    traits: createDomainSummary(traitModels),
  };
  
  // Create highlights from top actionable models
  const highlights: Highlight[] = rankedModels
    .filter(isActionable)
    .slice(0, 5)
    .map(createHighlight);
  
  // Add non-actionable highlights if we have room
  if (highlights.length < 5) {
    const remaining = rankedModels
      .filter((m) => !isActionable(m))
      .slice(0, 5 - highlights.length)
      .map(createHighlight);
    highlights.push(...remaining);
  }
  
  const modelSummaries = rankedModels.map((model) => buildModelSummary(model, userRsidSet));

  return {
    domains,
    highlights,
    modelSummaries,
    stats: {
      matchedModels: rankedModels.length,
      matchedSnps: matchedSnpCount,
      totalModelsScanned: totalScanned,
    },
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Create an empty analysis summary (for when no matches are found)
 */
export function createEmptyAnalysis(): AnalysisSummary {
  const emptyDomain: DomainSummary = {
    matchCount: 0,
    highlights: [],
    signalStrength: 'neutral',
    relevantGenes: [],
    relevantDrugs: [],
  };
  
  return {
    domains: {
      medication: { ...emptyDomain },
      health: { ...emptyDomain },
      traits: { ...emptyDomain },
    },
    highlights: [],
    modelSummaries: [],
    stats: {
      matchedModels: 0,
      matchedSnps: 0,
      totalModelsScanned: 0,
    },
    generatedAt: new Date().toISOString(),
  };
}

// Export utility functions for testing
export {
  determineSignalStrength,
  extractTitle,
  generateDescription,
  isActionable,
  mapToAnalysisDomain,
  createHighlight,
};
