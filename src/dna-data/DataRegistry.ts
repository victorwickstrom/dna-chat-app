/**
 * DataRegistry - Single entry point for the DNA Data Integration Layer
 * 
 * Usage:
 *   import { DataRegistry } from './dna-data/DataRegistry';
 *   await DataRegistry.initialize();
 *   const analysis = await DataRegistry.buildAnalysis(userRsids);
 */

import { IndexLoader } from './IndexLoader';
import { ModelLoader } from './ModelLoader';
import { rankModels, DEFAULT_MAX_MODELS } from './PriorityEngine';
import { buildAnalysis, createEmptyAnalysis } from './AnalysisBuilder';
import type { AnalysisSummary, GeneticModel, Metadata } from './ModelTypes';

interface BuildAnalysisOptions {
  maxModels?: number;
  includeTraits?: boolean;
  includeMedication?: boolean;
  includeHealth?: boolean;
}

const DEFAULT_OPTIONS: BuildAnalysisOptions = {
  maxModels: DEFAULT_MAX_MODELS,
  includeTraits: true,
  includeMedication: true,
  includeHealth: true,
};

class DataRegistrySingleton {
  private initialized = false;

  /**
   * Initialize the data layer - must be called before any analysis
   * Loads all index files into memory
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await IndexLoader.initialize();
    this.initialized = true;
  }

  /**
   * Check if the registry is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Build a complete analysis from user rsids
   * This is the main entry point for DNA analysis
   * 
   * @param userRsids - Array of rsid strings from user's DNA file
   * @param options - Optional configuration
   * @returns AnalysisSummary safe for AI consumption
   */
  async buildAnalysis(
    userRsids: string[],
    options: BuildAnalysisOptions = {}
  ): Promise<AnalysisSummary> {
    // Ensure initialized
    if (!this.initialized) {
      await this.initialize();
    }

    // Merge options with defaults
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Handle empty input
    if (!userRsids || userRsids.length === 0) {
      return createEmptyAnalysis();
    }

    // Step 1: Resolve rsids to model file paths
    const modelPaths = IndexLoader.getModelsForRsids(userRsids);
    
    if (modelPaths.length === 0) {
      return createEmptyAnalysis();
    }

    // Step 2: Filter paths by domain if options specified
    const filteredPaths = this.filterPathsByDomain(modelPaths, opts);

    // Step 3: Lazy-load required model files
    const models = await ModelLoader.loadModels(filteredPaths);

    if (models.length === 0) {
      return createEmptyAnalysis();
    }

    // Step 4: Rank models by priority
    const rankedModels = rankModels(models, opts.maxModels);

    // Step 5: Build safe analysis summary
    const matchedSnpCount = this.countMatchedSnps(userRsids, modelPaths);
    const analysis = buildAnalysis(rankedModels, matchedSnpCount, modelPaths.length, userRsids);

    return analysis;
  }

  /**
   * Get analysis for a specific gene
   */
  async getGeneAnalysis(
    gene: string,
    userRsids: string[]
  ): Promise<AnalysisSummary> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Get models for this gene
    const genePaths = IndexLoader.getModelsForGene(gene);
    
    // Also get models matching user rsids
    const rsidPaths = IndexLoader.getModelsForRsids(userRsids);
    
    // Find intersection (gene models that also match user rsids)
    const relevantPaths = genePaths.filter((p) => rsidPaths.includes(p));
    
    if (relevantPaths.length === 0) {
      // If no intersection, just return gene models
      const models = await ModelLoader.loadModels(genePaths.slice(0, 10));
      return buildAnalysis(models, 0, genePaths.length);
    }

    const models = await ModelLoader.loadModels(relevantPaths);
    const rankedModels = rankModels(models);
    
    return buildAnalysis(rankedModels, relevantPaths.length, genePaths.length);
  }

  /**
   * Get analysis for a specific drug
   */
  async getDrugAnalysis(
    drug: string,
    userRsids: string[]
  ): Promise<AnalysisSummary> {
    if (!this.initialized) {
      await this.initialize();
    }

    const drugPaths = IndexLoader.getModelsForDrug(drug);
    const rsidPaths = IndexLoader.getModelsForRsids(userRsids);
    
    const relevantPaths = drugPaths.filter((p) => rsidPaths.includes(p));
    
    if (relevantPaths.length === 0) {
      const models = await ModelLoader.loadModels(drugPaths.slice(0, 10));
      return buildAnalysis(models, 0, drugPaths.length);
    }

    const models = await ModelLoader.loadModels(relevantPaths);
    const rankedModels = rankModels(models);
    
    return buildAnalysis(rankedModels, relevantPaths.length, drugPaths.length);
  }

  /**
   * Get metadata about the genetic database
   */
  getMetadata(): Metadata | undefined {
    if (!this.initialized) {
      throw new Error('DataRegistry not initialized. Call initialize() first.');
    }
    return IndexLoader.getMetadata();
  }

  /**
   * Get database statistics
   */
  getStats(): { 
    totalModels: number; 
    cachedModels: number;
    indexesLoaded: boolean;
  } {
    const metadata = this.initialized ? IndexLoader.getMetadata() : undefined;
    const cacheStats = ModelLoader.getCacheStats();
    
    return {
      totalModels: metadata?.models.total ?? 0,
      cachedModels: cacheStats.cachedModels,
      indexesLoaded: this.initialized,
    };
  }

  /**
   * Preload models for better performance
   */
  async preloadModels(rsids: string[]): Promise<number> {
    if (!this.initialized) {
      await this.initialize();
    }

    const paths = IndexLoader.getModelsForRsids(rsids);
    return ModelLoader.preloadModels(paths);
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    IndexLoader.clearCache();
    ModelLoader.clearCache();
    this.initialized = false;
  }

  /**
   * Filter model paths by domain based on options
   */
  private filterPathsByDomain(
    paths: string[],
    opts: BuildAnalysisOptions
  ): string[] {
    if (opts.includeTraits && opts.includeMedication && opts.includeHealth) {
      return paths;
    }

    return paths.filter((path) => {
      const lowerPath = path.toLowerCase();
      
      if (lowerPath.includes('trait/') || lowerPath.startsWith('gwas')) {
        return opts.includeTraits;
      }
      if (lowerPath.includes('drug/') || lowerPath.includes('guideline/')) {
        return opts.includeMedication;
      }
      if (lowerPath.includes('gene/') || lowerPath.includes('variant/')) {
        return opts.includeHealth;
      }
      
      return true;
    });
  }

  /**
   * Count how many user rsids matched models
   */
  private countMatchedSnps(userRsids: string[], matchedPaths: string[]): number {
    const matchedRsids = new Set<string>();
    
    for (const rsid of userRsids) {
      const paths = IndexLoader.getModelsForRsid(rsid);
      if (paths.length > 0) {
        matchedRsids.add(rsid);
      }
    }
    
    return matchedRsids.size;
  }

  /**
   * Get all available genes in the database
   */
  getAvailableGenes(): string[] {
    if (!this.initialized) {
      throw new Error('DataRegistry not initialized. Call initialize() first.');
    }
    const indexes = IndexLoader.getLoadedIndexes();
    return Object.keys(indexes.gene);
  }

  /**
   * Get all available drugs in the database
   */
  getAvailableDrugs(): string[] {
    if (!this.initialized) {
      throw new Error('DataRegistry not initialized. Call initialize() first.');
    }
    const indexes = IndexLoader.getLoadedIndexes();
    return Object.keys(indexes.drug);
  }

  /**
   * Check if a specific rsid has known associations
   */
  hasRsidData(rsid: string): boolean {
    if (!this.initialized) {
      return false;
    }
    return IndexLoader.getModelsForRsid(rsid).length > 0;
  }

  /**
   * Get raw model data (for advanced use cases)
   * Note: This exposes raw data and should NOT be sent to AI
   */
  async getRawModels(modelRefs: string[]): Promise<GeneticModel[]> {
    if (!this.initialized) {
      await this.initialize();
    }
    return ModelLoader.loadModels(modelRefs);
  }
}

// Export singleton instance
export const DataRegistry = new DataRegistrySingleton();

// Export types for consumers
export type { AnalysisSummary, BuildAnalysisOptions };

// Export class for testing
export { DataRegistrySingleton };
