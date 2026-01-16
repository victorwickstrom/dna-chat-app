import {
  buildAnalysis,
  createEmptyAnalysis,
  determineSignalStrength,
  extractTitle,
  generateDescription,
  isActionable,
  mapToAnalysisDomain,
  createHighlight,
} from '../../dna-data/AnalysisBuilder';
import type { GeneticModel, AnalysisSummary } from '../../dna-data/ModelTypes';

const createMockModel = (overrides: Partial<GeneticModel> = {}): GeneticModel => ({
  id: 'test-model',
  domain: 'trait',
  gene: null,
  drug: null,
  rsid: null,
  phenotype: null,
  effect: null,
  evidence_level: 'unknown',
  odds_ratio: null,
  pvalue: null,
  confidence_interval: null,
  source: 'test',
  source_url: null,
  last_updated: new Date().toISOString(),
  references: [],
  ...overrides,
});

describe('AnalysisBuilder', () => {
  describe('determineSignalStrength', () => {
    it('should return strong for high evidence', () => {
      const model = createMockModel({ evidence_level: 'high' });
      expect(determineSignalStrength(model)).toBe('strong');
    });

    it('should return strong for drug models', () => {
      const model = createMockModel({ domain: 'drug' });
      expect(determineSignalStrength(model)).toBe('strong');
    });

    it('should return moderate for medium evidence', () => {
      const model = createMockModel({ evidence_level: 'medium' });
      expect(determineSignalStrength(model)).toBe('moderate');
    });

    it('should return weak for low evidence', () => {
      const model = createMockModel({ evidence_level: 'low' });
      expect(determineSignalStrength(model)).toBe('weak');
    });

    it('should return neutral for unknown evidence', () => {
      const model = createMockModel({ evidence_level: 'unknown' });
      expect(determineSignalStrength(model)).toBe('neutral');
    });
  });

  describe('extractTitle', () => {
    it('should use phenotype when available and clean', () => {
      const model = createMockModel({ phenotype: 'Caffeine metabolism' });
      expect(extractTitle(model)).toBe('Caffeine metabolism');
    });

    it('should not use phenotype with rsid', () => {
      const model = createMockModel({ 
        phenotype: 'GWAS association for rs12345',
        drug: 'aspirin'
      });
      const title = extractTitle(model);
      expect(title).not.toContain('rs12345');
    });

    it('should build from drug and gene', () => {
      const model = createMockModel({ drug: 'warfarin', gene: 'CYP2C9' });
      expect(extractTitle(model)).toBe('warfarin response (CYP2C9)');
    });

    it('should clean model ID as fallback', () => {
      const model = createMockModel({ id: 'caffeine_metabolism' });
      expect(extractTitle(model)).toBe('caffeine metabolism');
    });
  });

  describe('generateDescription', () => {
    it('should include source', () => {
      const model = createMockModel({ source: 'CPIC' });
      expect(generateDescription(model)).toContain('CPIC');
    });

    it('should include gene context', () => {
      const model = createMockModel({ gene: 'CYP2D6' });
      expect(generateDescription(model)).toContain('CYP2D6');
    });

    it('should include drug context', () => {
      const model = createMockModel({ drug: 'codeine' });
      expect(generateDescription(model)).toContain('codeine');
    });

    it('should not include raw rsids', () => {
      const model = createMockModel({ effect: 'Associated with rs12345' });
      const description = generateDescription(model);
      expect(description).not.toContain('rs12345');
    });
  });

  describe('isActionable', () => {
    it('should return true for drug models', () => {
      const model = createMockModel({ domain: 'drug' });
      expect(isActionable(model)).toBe(true);
    });

    it('should return true for models with drug reference', () => {
      const model = createMockModel({ domain: 'trait', drug: 'aspirin' });
      expect(isActionable(model)).toBe(true);
    });

    it('should return true for guideline models', () => {
      const model = createMockModel({ domain: 'guideline' });
      expect(isActionable(model)).toBe(true);
    });

    it('should return true for high evidence', () => {
      const model = createMockModel({ evidence_level: 'high' });
      expect(isActionable(model)).toBe(true);
    });

    it('should return false for low evidence trait', () => {
      const model = createMockModel({ domain: 'trait', evidence_level: 'low' });
      expect(isActionable(model)).toBe(false);
    });
  });

  describe('mapToAnalysisDomain', () => {
    it('should map drug to medication', () => {
      const model = createMockModel({ domain: 'drug' });
      expect(mapToAnalysisDomain(model)).toBe('medication');
    });

    it('should map guideline to medication', () => {
      const model = createMockModel({ domain: 'guideline' });
      expect(mapToAnalysisDomain(model)).toBe('medication');
    });

    it('should map trait to traits', () => {
      const model = createMockModel({ domain: 'trait' });
      expect(mapToAnalysisDomain(model)).toBe('traits');
    });

    it('should map gene to health', () => {
      const model = createMockModel({ domain: 'gene' });
      expect(mapToAnalysisDomain(model)).toBe('health');
    });

    it('should map variant to health', () => {
      const model = createMockModel({ domain: 'variant' });
      expect(mapToAnalysisDomain(model)).toBe('health');
    });
  });

  describe('createHighlight', () => {
    it('should create highlight with all properties', () => {
      const model = createMockModel({
        domain: 'drug',
        gene: 'CYP2D6',
        drug: 'codeine',
      });

      const highlight = createHighlight(model);

      expect(highlight.domain).toBe('drug');
      expect(highlight.relevantGenes).toContain('CYP2D6');
      expect(highlight.relevantDrugs).toContain('codeine');
      expect(highlight.actionable).toBe(true);
      expect(typeof highlight.title).toBe('string');
      expect(typeof highlight.description).toBe('string');
    });
  });

  describe('buildAnalysis', () => {
    it('should create analysis with correct structure', () => {
      const models = [
        createMockModel({ id: 'drug-1', domain: 'drug', drug: 'aspirin' }),
        createMockModel({ id: 'trait-1', domain: 'trait' }),
      ];

      const analysis = buildAnalysis(models, 2, 10);

      expect(analysis.domains).toHaveProperty('medication');
      expect(analysis.domains).toHaveProperty('health');
      expect(analysis.domains).toHaveProperty('traits');
      expect(analysis.highlights).toBeDefined();
      expect(analysis.stats.matchedModels).toBe(2);
      expect(analysis.stats.matchedSnps).toBe(2);
      expect(analysis.stats.totalModelsScanned).toBe(10);
      expect(analysis.generatedAt).toBeDefined();
    });

    it('should not include raw rsids in output', () => {
      const models = [
        createMockModel({ 
          id: 'test', 
          rsid: 'rs12345',
          phenotype: 'GWAS association for rs12345'
        }),
      ];

      const analysis = buildAnalysis(models, 1, 1);
      const analysisJson = JSON.stringify(analysis);

      expect(analysisJson).not.toContain('rs12345');
    });

    it('should be deterministic', () => {
      const models = [
        createMockModel({ id: 'a', domain: 'drug' }),
        createMockModel({ id: 'b', domain: 'trait' }),
      ];

      const analysis1 = buildAnalysis([...models], 2, 5);
      const analysis2 = buildAnalysis([...models], 2, 5);

      // Compare without generatedAt which will differ
      const { generatedAt: _, ...rest1 } = analysis1;
      const { generatedAt: __, ...rest2 } = analysis2;

      expect(rest1).toEqual(rest2);
    });

    it('should categorize models into correct domains', () => {
      const models = [
        createMockModel({ id: 'drug-1', domain: 'drug' }),
        createMockModel({ id: 'trait-1', domain: 'trait' }),
        createMockModel({ id: 'gene-1', domain: 'gene' }),
      ];

      const analysis = buildAnalysis(models, 3, 3);

      expect(analysis.domains.medication.matchCount).toBe(1);
      expect(analysis.domains.traits.matchCount).toBe(1);
      expect(analysis.domains.health.matchCount).toBe(1);
    });
  });

  describe('createEmptyAnalysis', () => {
    it('should create valid empty analysis', () => {
      const analysis = createEmptyAnalysis();

      expect(analysis.domains.medication.matchCount).toBe(0);
      expect(analysis.domains.health.matchCount).toBe(0);
      expect(analysis.domains.traits.matchCount).toBe(0);
      expect(analysis.highlights).toEqual([]);
      expect(analysis.stats.matchedModels).toBe(0);
      expect(analysis.stats.matchedSnps).toBe(0);
    });
  });
});
