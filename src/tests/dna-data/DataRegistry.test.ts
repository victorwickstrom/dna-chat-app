/**
 * Integration tests for DataRegistry
 * Note: These tests mock fetch to avoid actual network calls
 */

import { DataRegistrySingleton } from '../../dna-data/DataRegistry';
import { IndexLoader } from '../../dna-data/IndexLoader';
import { ModelLoader } from '../../dna-data/ModelLoader';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Sample mock data
const mockRsidIndex = {
  'rs12345': ['trait/GWAS_1.json'],
  'rs67890': ['trait/GWAS_2.json', 'drug/CPIC_drug_test_1.json'],
};

const mockGeneIndex = {
  'CYP2D6': ['gene/CPIC_gene_CYP2D6_1.json'],
};

const mockDrugIndex = {
  'aspirin': ['drug/CPIC_drug_aspirin_1.json'],
};

const mockDomainIndex = {
  'drug': ['CPIC_drug_aspirin_1'],
  'trait': ['GWAS_1', 'GWAS_2'],
};

const mockMetadata = {
  errors: null,
  indexes: { domain: 2, drug: 1, gene: 1, rsid: 2 },
  models: { by_domain: { drug: 1, gene: 1, guideline: 0, trait: 2, variant: 0 }, total: 4 },
  run_info: { duration_seconds: 1, end_time: '2024-01-01', start_time: '2024-01-01', platform: 'test', python_version: '3.9' },
  sources: { cpic: { errors: 0, processed: 1 }, gwas: { errors: 0, processed: 2 }, pharmgkb: { errors: 0, processed: 0 } },
  status: { error_count: 0, success: true, warning_count: 0 },
  version: '1.0.0',
  warnings: null,
};

const mockTraitModel = {
  id: 'GWAS_1',
  domain: 'trait',
  gene: 'TEST_GENE',
  drug: null,
  rsid: 'rs12345',
  phenotype: 'Test trait',
  effect: null,
  evidence_level: 'medium',
  odds_ratio: 1.3,
  pvalue: 0.001,
  confidence_interval: null,
  source: 'GWAS',
  source_url: null,
  last_updated: '2024-01-01',
  references: [],
};

const mockDrugModel = {
  id: 'CPIC_drug_test_1',
  domain: 'drug',
  gene: 'CYP2D6',
  drug: 'test-drug',
  rsid: null,
  phenotype: null,
  effect: 'Affects drug metabolism',
  evidence_level: 'high',
  odds_ratio: null,
  pvalue: null,
  confidence_interval: null,
  source: 'CPIC',
  source_url: null,
  last_updated: '2024-01-01',
  references: [],
};

describe('DataRegistry', () => {
  let registry: DataRegistrySingleton;

  beforeEach(() => {
    // Clear all singleton caches before each test
    IndexLoader.clearCache();
    ModelLoader.clearCache();
    
    registry = new DataRegistrySingleton();
    mockFetch.mockReset();

    // Setup default mock responses
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('rsid-index.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockRsidIndex) });
      }
      if (url.includes('gene-index.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockGeneIndex) });
      }
      if (url.includes('drug-index.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockDrugIndex) });
      }
      if (url.includes('domain-index.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockDomainIndex) });
      }
      if (url.includes('metadata.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockMetadata) });
      }
      if (url.includes('GWAS_1.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTraitModel) });
      }
      if (url.includes('CPIC_drug_test_1.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockDrugModel) });
      }
      return Promise.resolve({ ok: false, status: 404, statusText: 'Not Found' });
    });
  });

  describe('initialize', () => {
    it('should load all indexes', async () => {
      await registry.initialize();

      expect(registry.isInitialized()).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('rsid-index.json'));
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('gene-index.json'));
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('drug-index.json'));
    });

    it('should only initialize once', async () => {
      await registry.initialize();
      await registry.initialize();

      // Second call should not trigger additional fetches
      const rsidFetchCount = mockFetch.mock.calls.filter(
        call => call[0].includes('rsid-index.json')
      ).length;
      expect(rsidFetchCount).toBe(1);
    });
  });

  describe('buildAnalysis', () => {
    it('should return empty analysis for empty input', async () => {
      const analysis = await registry.buildAnalysis([]);

      expect(analysis.stats.matchedModels).toBe(0);
      expect(analysis.stats.matchedSnps).toBe(0);
      expect(analysis.highlights).toEqual([]);
    });

    it('should build analysis from rsids', async () => {
      const analysis = await registry.buildAnalysis(['rs12345']);

      expect(analysis.stats.matchedModels).toBeGreaterThan(0);
      expect(analysis.domains).toBeDefined();
      expect(analysis.generatedAt).toBeDefined();
    });

    it('should not expose raw rsids in output', async () => {
      const analysis = await registry.buildAnalysis(['rs12345', 'rs67890']);
      const analysisJson = JSON.stringify(analysis);

      expect(analysisJson).not.toContain('rs12345');
      expect(analysisJson).not.toContain('rs67890');
    });

    it('should not expose p-values in output', async () => {
      const analysis = await registry.buildAnalysis(['rs12345']);
      const analysisJson = JSON.stringify(analysis);

      expect(analysisJson).not.toContain('pvalue');
      expect(analysisJson).not.toContain('0.001');
    });

    it('should not expose odds ratios in output', async () => {
      const analysis = await registry.buildAnalysis(['rs12345']);
      const analysisJson = JSON.stringify(analysis);

      expect(analysisJson).not.toContain('odds_ratio');
    });

    it('should respect maxModels option', async () => {
      const analysis = await registry.buildAnalysis(['rs67890'], { maxModels: 1 });

      expect(analysis.stats.matchedModels).toBeLessThanOrEqual(1);
    });
  });

  describe('getStats', () => {
    it('should return stats after initialization', async () => {
      await registry.initialize();
      const stats = registry.getStats();

      expect(stats.indexesLoaded).toBe(true);
      expect(stats.totalModels).toBe(4);
    });

    it('should report indexes not loaded before init', () => {
      const stats = registry.getStats();

      expect(stats.indexesLoaded).toBe(false);
    });
  });

  describe('hasRsidData', () => {
    it('should return true for known rsids', async () => {
      await registry.initialize();

      expect(registry.hasRsidData('rs12345')).toBe(true);
    });

    it('should return false for unknown rsids', async () => {
      await registry.initialize();

      expect(registry.hasRsidData('rs99999')).toBe(false);
    });

    it('should return false before initialization', () => {
      expect(registry.hasRsidData('rs12345')).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('should reset initialized state', async () => {
      await registry.initialize();
      expect(registry.isInitialized()).toBe(true);

      registry.clearCache();
      expect(registry.isInitialized()).toBe(false);
    });
  });
});
