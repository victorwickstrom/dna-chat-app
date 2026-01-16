/**
 * ModelLoader - Responsible for lazy-loading genetic model JSON files
 * Caches loaded models to prevent duplicate fetches
 */

import { modelCache } from './cache';
import type { GeneticModel, ModelDomain } from './ModelTypes';

const DATA_BASE_PATH = '/data/genetic_models';

/**
 * Validate that a loaded object matches the expected GeneticModel structure
 */
function validateModel(data: unknown, modelRef: string): GeneticModel {
  if (!data || typeof data !== 'object') {
    throw new Error(`Invalid model data for ${modelRef}: not an object`);
  }

  const obj = data as Record<string, unknown>;

  // Required fields
  if (typeof obj.id !== 'string') {
    throw new Error(`Invalid model ${modelRef}: missing or invalid 'id'`);
  }

  // Determine domain - handle both 'domain' and legacy 'category' fields
  let domain: ModelDomain;
  if (typeof obj.domain === 'string') {
    domain = obj.domain as ModelDomain;
  } else if (typeof obj.category === 'string') {
    // Map legacy category to domain
    domain = obj.category as ModelDomain;
  } else {
    throw new Error(`Invalid model ${modelRef}: missing 'domain' or 'category'`);
  }

  // Build validated model
  const model: GeneticModel = {
    id: obj.id as string,
    domain,
    gene: typeof obj.gene === 'string' ? obj.gene : null,
    drug: typeof obj.drug === 'string' ? obj.drug : null,
    rsid: typeof obj.rsid === 'string' ? obj.rsid : null,
    phenotype: typeof obj.phenotype === 'string' ? obj.phenotype : null,
    effect: typeof obj.effect === 'string' ? obj.effect : null,
    evidence_level: typeof obj.evidence_level === 'string' ? obj.evidence_level : 'unknown',
    odds_ratio: typeof obj.odds_ratio === 'number' ? obj.odds_ratio : null,
    pvalue: typeof obj.pvalue === 'number' ? obj.pvalue : null,
    confidence_interval: typeof obj.confidence_interval === 'string' ? obj.confidence_interval : null,
    source: typeof obj.source === 'string' ? obj.source : 'unknown',
    source_url: typeof obj.source_url === 'string' ? obj.source_url : null,
    last_updated: typeof obj.last_updated === 'string' ? obj.last_updated : new Date().toISOString(),
    references: Array.isArray(obj.references) ? obj.references : [],
  };

  // Handle legacy fields
  if (obj.category) {
    model.category = obj.category as string;
  }
  if (Array.isArray(obj.snps)) {
    model.snps = obj.snps;
  }
  if (typeof obj.population === 'string') {
    model.population = obj.population;
  }
  if (obj.interpretation && typeof obj.interpretation === 'object') {
    model.interpretation = obj.interpretation as GeneticModel['interpretation'];
  }
  if (Array.isArray(obj.evidence)) {
    model.evidence = obj.evidence;
  }
  if (typeof obj.severity === 'string') {
    model.severity = obj.severity;
  }
  if (typeof obj.confidence === 'string') {
    model.confidence = obj.confidence;
  }

  return model;
}

/**
 * Parse a model reference string to determine the file path
 * Handles various formats:
 * - "trait/GWAS_101.json" -> /data/genetic_models/trait/GWAS_101.json
 * - "GWAS_101" -> searches in trait folder
 * - "drug:simvastatin" -> resolves to drug model
 */
function resolveModelPath(modelRef: string): string {
  // If already has .json extension and path separator, use as-is
  if (modelRef.includes('/') && modelRef.endsWith('.json')) {
    return `${DATA_BASE_PATH}/${modelRef}`;
  }

  // If has .json but no path, add it
  if (modelRef.endsWith('.json')) {
    // Try to infer domain from filename prefix
    if (modelRef.startsWith('GWAS_')) {
      return `${DATA_BASE_PATH}/trait/${modelRef}`;
    }
    if (modelRef.startsWith('CPIC_drug_')) {
      return `${DATA_BASE_PATH}/drug/${modelRef}`;
    }
    if (modelRef.startsWith('CPIC_gene_')) {
      return `${DATA_BASE_PATH}/gene/${modelRef}`;
    }
    if (modelRef.startsWith('CPIC_GL_')) {
      return `${DATA_BASE_PATH}/guideline/${modelRef}`;
    }
    if (modelRef.startsWith('PharmGKB_')) {
      return `${DATA_BASE_PATH}/variant/${modelRef}`;
    }
    // Default to root
    return `${DATA_BASE_PATH}/${modelRef}`;
  }

  // Handle colon-separated format: "domain:id"
  if (modelRef.includes(':')) {
    const [domain, id] = modelRef.split(':');
    return `${DATA_BASE_PATH}/${domain}/${id}.json`;
  }

  // Try to infer from model ID pattern
  if (modelRef.startsWith('GWAS_')) {
    return `${DATA_BASE_PATH}/trait/${modelRef}.json`;
  }
  if (modelRef.startsWith('CPIC_drug_')) {
    return `${DATA_BASE_PATH}/drug/${modelRef}.json`;
  }
  if (modelRef.startsWith('CPIC_gene_')) {
    return `${DATA_BASE_PATH}/gene/${modelRef}.json`;
  }
  if (modelRef.startsWith('CPIC_GL_')) {
    return `${DATA_BASE_PATH}/guideline/${modelRef}.json`;
  }
  if (modelRef.startsWith('PharmGKB_')) {
    return `${DATA_BASE_PATH}/variant/${modelRef}.json`;
  }

  // Default: assume it's in root genetic_models folder
  return `${DATA_BASE_PATH}/${modelRef}.json`;
}

/**
 * Generate a cache key from a model reference
 */
function getCacheKey(modelRef: string): string {
  return `model:${resolveModelPath(modelRef)}`;
}

class ModelLoaderSingleton {
  /**
   * Load a single genetic model by reference
   */
  async loadModel(modelRef: string): Promise<GeneticModel> {
    const cacheKey = getCacheKey(modelRef);
    const filePath = resolveModelPath(modelRef);

    return modelCache.fetchWithDedup(cacheKey, async () => {
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to load model ${modelRef}: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      return validateModel(data, modelRef);
    });
  }

  /**
   * Load multiple models in parallel
   * Returns only successfully loaded models
   */
  async loadModels(modelRefs: string[]): Promise<GeneticModel[]> {
    const uniqueRefs = [...new Set(modelRefs)];
    const results: GeneticModel[] = [];
    const BATCH_SIZE = 6;

    for (let i = 0; i < uniqueRefs.length; i += BATCH_SIZE) {
      const batch = uniqueRefs.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (ref) => {
          try {
            const model = await this.loadModel(ref);
            results.push(model);
          } catch (error) {
            console.warn(`Failed to load model ${ref}:`, error);
          }
        })
      );
      await new Promise((resolve) => setTimeout(resolve, 30));
    }

    return results;
  }

  /**
   * Load models and return as a map keyed by model ID
   */
  async loadModelsAsMap(modelRefs: string[]): Promise<Map<string, GeneticModel>> {
    const models = await this.loadModels(modelRefs);
    const map = new Map<string, GeneticModel>();
    
    for (const model of models) {
      map.set(model.id, model);
    }
    
    return map;
  }

  /**
   * Check if a model is already cached
   */
  isCached(modelRef: string): boolean {
    return modelCache.has(getCacheKey(modelRef));
  }

  /**
   * Get a cached model without fetching
   */
  getCached(modelRef: string): GeneticModel | undefined {
    return modelCache.get<GeneticModel>(getCacheKey(modelRef));
  }

  /**
   * Preload models for faster subsequent access
   */
  async preloadModels(modelRefs: string[]): Promise<number> {
    const models = await this.loadModels(modelRefs);
    return models.length;
  }

  /**
   * Get current cache statistics
   */
  getCacheStats(): { cachedModels: number } {
    return {
      cachedModels: modelCache.size(),
    };
  }

  /**
   * Clear the model cache
   */
  clearCache(): void {
    modelCache.clear();
  }
}

// Export singleton instance
export const ModelLoader = new ModelLoaderSingleton();

// Export for testing
export { ModelLoaderSingleton, resolveModelPath, validateModel };
