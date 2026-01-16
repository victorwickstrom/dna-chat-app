import {
  rankModels,
  rankModelsWithScores,
  determineRiskClass,
  calculateScore,
  normalizeEvidenceLevel,
  filterByMinScore,
  groupByRiskClass,
  getConditionalModels,
  getMedicationModels,
} from '../../dna-data/PriorityEngine';
import type { GeneticModel } from '../../dna-data/ModelTypes';

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

describe('PriorityEngine', () => {
  describe('determineRiskClass', () => {
    it('should classify drug models as conditional', () => {
      const model = createMockModel({ domain: 'drug', drug: 'aspirin' });
      expect(determineRiskClass(model)).toBe('conditional');
    });

    it('should classify guideline models as conditional', () => {
      const model = createMockModel({ domain: 'guideline' });
      expect(determineRiskClass(model)).toBe('conditional');
    });

    it('should classify gene models with effects as conditional', () => {
      const model = createMockModel({ domain: 'gene', effect: 'affects metabolism' });
      expect(determineRiskClass(model)).toBe('conditional');
    });

    it('should classify variant models as probabilistic', () => {
      const model = createMockModel({ domain: 'variant' });
      expect(determineRiskClass(model)).toBe('probabilistic');
    });

    it('should classify high odds ratio traits as probabilistic', () => {
      const model = createMockModel({ domain: 'trait', odds_ratio: 2.0 });
      expect(determineRiskClass(model)).toBe('probabilistic');
    });

    it('should classify significant p-value traits as probabilistic', () => {
      const model = createMockModel({ domain: 'trait', pvalue: 1e-10 });
      expect(determineRiskClass(model)).toBe('probabilistic');
    });

    it('should classify low significance traits as informational', () => {
      const model = createMockModel({ domain: 'trait', odds_ratio: 1.1 });
      expect(determineRiskClass(model)).toBe('informational');
    });
  });

  describe('normalizeEvidenceLevel', () => {
    it('should normalize high evidence levels', () => {
      expect(normalizeEvidenceLevel('high')).toBe('high');
      expect(normalizeEvidenceLevel('1')).toBe('high');
      expect(normalizeEvidenceLevel('1a')).toBe('high');
      expect(normalizeEvidenceLevel('1b')).toBe('high');
    });

    it('should normalize medium evidence levels', () => {
      expect(normalizeEvidenceLevel('medium')).toBe('medium');
      expect(normalizeEvidenceLevel('moderate')).toBe('medium');
      expect(normalizeEvidenceLevel('2')).toBe('medium');
      expect(normalizeEvidenceLevel('2a')).toBe('medium');
    });

    it('should normalize low evidence levels', () => {
      expect(normalizeEvidenceLevel('low')).toBe('low');
      expect(normalizeEvidenceLevel('3')).toBe('low');
      expect(normalizeEvidenceLevel('4')).toBe('low');
    });

    it('should return unknown for unrecognized levels', () => {
      expect(normalizeEvidenceLevel('unknown')).toBe('unknown');
      expect(normalizeEvidenceLevel('something-else')).toBe('unknown');
    });
  });

  describe('rankModels', () => {
    it('should return empty array for empty input', () => {
      expect(rankModels([])).toEqual([]);
    });

    it('should rank drug models higher than traits', () => {
      const drugModel = createMockModel({ id: 'drug-1', domain: 'drug', drug: 'aspirin' });
      const traitModel = createMockModel({ id: 'trait-1', domain: 'trait' });

      const ranked = rankModels([traitModel, drugModel]);

      expect(ranked[0].id).toBe('drug-1');
      expect(ranked[1].id).toBe('trait-1');
    });

    it('should rank high evidence higher than low evidence', () => {
      const highEvidence = createMockModel({ id: 'high', domain: 'trait', evidence_level: 'high' });
      const lowEvidence = createMockModel({ id: 'low', domain: 'trait', evidence_level: 'low' });

      const ranked = rankModels([lowEvidence, highEvidence]);

      expect(ranked[0].id).toBe('high');
      expect(ranked[1].id).toBe('low');
    });

    it('should respect maxModels limit', () => {
      const models = [
        createMockModel({ id: 'model-1' }),
        createMockModel({ id: 'model-2' }),
        createMockModel({ id: 'model-3' }),
        createMockModel({ id: 'model-4' }),
        createMockModel({ id: 'model-5' }),
        createMockModel({ id: 'model-6' }),
      ];

      const ranked = rankModels(models, 3);

      expect(ranked.length).toBe(3);
    });

    it('should default to 5 models max', () => {
      const models = Array.from({ length: 10 }, (_, i) => 
        createMockModel({ id: `model-${i}` })
      );

      const ranked = rankModels(models);

      expect(ranked.length).toBe(5);
    });

    it('should be deterministic (same input = same output)', () => {
      const models = [
        createMockModel({ id: 'a', domain: 'drug', drug: 'x' }),
        createMockModel({ id: 'b', domain: 'trait' }),
        createMockModel({ id: 'c', domain: 'gene', effect: 'y' }),
      ];

      const ranked1 = rankModels([...models]);
      const ranked2 = rankModels([...models]);

      expect(ranked1.map(m => m.id)).toEqual(ranked2.map(m => m.id));
    });
  });

  describe('rankModelsWithScores', () => {
    it('should return models with scores', () => {
      const model = createMockModel({ id: 'test', domain: 'drug' });
      const ranked = rankModelsWithScores([model]);

      expect(ranked[0]).toHaveProperty('model');
      expect(ranked[0]).toHaveProperty('score');
      expect(ranked[0]).toHaveProperty('riskClass');
      expect(typeof ranked[0].score).toBe('number');
    });
  });

  describe('filterByMinScore', () => {
    it('should filter models below threshold', () => {
      const highScore = createMockModel({ id: 'high', domain: 'drug', drug: 'x' });
      const lowScore = createMockModel({ id: 'low', domain: 'trait' });

      const filtered = filterByMinScore([highScore, lowScore], 300);

      expect(filtered.some(m => m.id === 'high')).toBe(true);
      expect(filtered.some(m => m.id === 'low')).toBe(false);
    });
  });

  describe('groupByRiskClass', () => {
    it('should group models by risk class', () => {
      const conditional = createMockModel({ id: 'c', domain: 'drug' });
      const probabilistic = createMockModel({ id: 'p', domain: 'variant' });
      const informational = createMockModel({ id: 'i', domain: 'trait' });

      const groups = groupByRiskClass([conditional, probabilistic, informational]);

      expect(groups.get('conditional')?.length).toBe(1);
      expect(groups.get('probabilistic')?.length).toBe(1);
      expect(groups.get('informational')?.length).toBe(1);
    });
  });

  describe('getConditionalModels', () => {
    it('should return only conditional models', () => {
      const models = [
        createMockModel({ id: 'drug', domain: 'drug' }),
        createMockModel({ id: 'trait', domain: 'trait' }),
        createMockModel({ id: 'guideline', domain: 'guideline' }),
      ];

      const conditional = getConditionalModels(models);

      expect(conditional.length).toBe(2);
      expect(conditional.map(m => m.id)).toContain('drug');
      expect(conditional.map(m => m.id)).toContain('guideline');
    });
  });

  describe('getMedicationModels', () => {
    it('should return drug and guideline models', () => {
      const models = [
        createMockModel({ id: 'drug', domain: 'drug' }),
        createMockModel({ id: 'trait', domain: 'trait' }),
        createMockModel({ id: 'guideline', domain: 'guideline' }),
        createMockModel({ id: 'trait-with-drug', domain: 'trait', drug: 'aspirin' }),
      ];

      const medication = getMedicationModels(models);

      expect(medication.length).toBe(3);
      expect(medication.map(m => m.id)).toContain('drug');
      expect(medication.map(m => m.id)).toContain('guideline');
      expect(medication.map(m => m.id)).toContain('trait-with-drug');
    });
  });
});
