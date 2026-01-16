/**
 * IndexLoader - Responsible for loading and caching index files
 * Singleton pattern ensures indexes are loaded only once
 */

import { indexCache } from './cache';
import type {
  RsidIndex,
  GeneIndex,
  DrugIndex,
  DomainIndex,
  Metadata,
  LoadedIndexes,
} from './ModelTypes';

const DATA_BASE_PATH = '/data';

const INDEX_PATHS = {
  rsid: `${DATA_BASE_PATH}/indexes/rsid-index.json`,
  gene: `${DATA_BASE_PATH}/indexes/gene-index.json`,
  drug: `${DATA_BASE_PATH}/indexes/drug-index.json`,
  domain: `${DATA_BASE_PATH}/indexes/domain-index.json`,
  metadata: `${DATA_BASE_PATH}/metadata.json`,
} as const;

const CACHE_KEYS = {
  rsid: 'index:rsid',
  gene: 'index:gene',
  drug: 'index:drug',
  domain: 'index:domain',
  metadata: 'index:metadata',
  initialized: 'index:initialized',
} as const;

class IndexLoaderSingleton {
  private initialized = false;

  /**
   * Fetch and parse a JSON file
   */
  private async fetchJson<T>(path: string): Promise<T> {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${path}: ${response.status} ${response.statusText}`);
    }
    return response.json() as Promise<T>;
  }

  /**
   * Initialize all indexes - must be called before any lookups
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await Promise.all([
      indexCache.fetchWithDedup(CACHE_KEYS.rsid, () =>
        this.fetchJson<RsidIndex>(INDEX_PATHS.rsid)
      ),
      indexCache.fetchWithDedup(CACHE_KEYS.gene, () =>
        this.fetchJson<GeneIndex>(INDEX_PATHS.gene)
      ),
      indexCache.fetchWithDedup(CACHE_KEYS.drug, () =>
        this.fetchJson<DrugIndex>(INDEX_PATHS.drug)
      ),
      indexCache.fetchWithDedup(CACHE_KEYS.domain, () =>
        this.fetchJson<DomainIndex>(INDEX_PATHS.domain)
      ),
      indexCache.fetchWithDedup(CACHE_KEYS.metadata, () =>
        this.fetchJson<Metadata>(INDEX_PATHS.metadata)
      ),
    ]);

    this.initialized = true;
  }

  /**
   * Check if indexes are loaded
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get all loaded indexes
   */
  getLoadedIndexes(): LoadedIndexes {
    this.ensureInitialized();
    
    return {
      rsid: indexCache.get<RsidIndex>(CACHE_KEYS.rsid)!,
      gene: indexCache.get<GeneIndex>(CACHE_KEYS.gene)!,
      drug: indexCache.get<DrugIndex>(CACHE_KEYS.drug)!,
      domain: indexCache.get<DomainIndex>(CACHE_KEYS.domain)!,
      metadata: indexCache.get<Metadata>(CACHE_KEYS.metadata)!,
    };
  }

  /**
   * Ensure indexes are initialized before lookup
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('IndexLoader not initialized. Call initialize() first.');
    }
  }

  /**
   * Get model file paths for a given rsid
   * Returns array of relative file paths like ["trait/GWAS_2006.json"]
   */
  getModelsForRsid(rsid: string): string[] {
    this.ensureInitialized();
    const index = indexCache.get<RsidIndex>(CACHE_KEYS.rsid);
    if (!index) return [];
    
    const normalizedRsid = rsid.toLowerCase().startsWith('rs') 
      ? rsid.toLowerCase() 
      : `rs${rsid}`;
    
    return index[rsid] || index[normalizedRsid] || [];
  }

  /**
   * Get model file paths for a given gene
   * Returns array of relative file paths
   */
  getModelsForGene(gene: string): string[] {
    this.ensureInitialized();
    const index = indexCache.get<GeneIndex>(CACHE_KEYS.gene);
    if (!index) return [];
    
    // Try exact match first, then uppercase
    return index[gene] || index[gene.toUpperCase()] || [];
  }

  /**
   * Get model file paths for a given drug
   * Returns array of relative file paths
   */
  getModelsForDrug(drug: string): string[] {
    this.ensureInitialized();
    const index = indexCache.get<DrugIndex>(CACHE_KEYS.drug);
    if (!index) return [];
    
    // Try exact match first, then lowercase
    return index[drug] || index[drug.toLowerCase()] || [];
  }

  /**
   * Get all model identifiers for a given domain
   */
  getModelsForDomain(domain: string): string[] {
    this.ensureInitialized();
    const index = indexCache.get<DomainIndex>(CACHE_KEYS.domain);
    if (!index) return [];
    
    return index[domain] || [];
  }

  /**
   * Get metadata about the data collection
   */
  getMetadata(): Metadata | undefined {
    this.ensureInitialized();
    return indexCache.get<Metadata>(CACHE_KEYS.metadata);
  }

  /**
   * Batch lookup: get all model paths for multiple rsids
   * Returns deduplicated array of file paths
   */
  getModelsForRsids(rsids: string[]): string[] {
    const allPaths = new Set<string>();
    
    for (const rsid of rsids) {
      const paths = this.getModelsForRsid(rsid);
      for (const path of paths) {
        allPaths.add(path);
      }
    }
    
    return Array.from(allPaths);
  }

  /**
   * Resolve model paths to include rsid information
   * Returns map of file path -> matching rsids
   */
  resolveRsidMatches(rsids: string[]): Map<string, string[]> {
    const pathToRsids = new Map<string, string[]>();
    
    for (const rsid of rsids) {
      const paths = this.getModelsForRsid(rsid);
      for (const path of paths) {
        const existing = pathToRsids.get(path) || [];
        existing.push(rsid);
        pathToRsids.set(path, existing);
      }
    }
    
    return pathToRsids;
  }

  /**
   * Clear all cached indexes (useful for testing or refresh)
   */
  clearCache(): void {
    indexCache.clear();
    this.initialized = false;
  }
}

// Export singleton instance
export const IndexLoader = new IndexLoaderSingleton();

// Export class for testing
export { IndexLoaderSingleton };
