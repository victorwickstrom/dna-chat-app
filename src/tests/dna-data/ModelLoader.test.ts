import { resolveModelPath, validateModel } from '../../dna-data/ModelLoader';

describe('ModelLoader', () => {
  describe('resolveModelPath', () => {
    it('should resolve full path with extension', () => {
      const path = resolveModelPath('trait/GWAS_101.json');
      expect(path).toBe('/data/genetic_models/trait/GWAS_101.json');
    });

    it('should resolve GWAS models to trait folder', () => {
      const path = resolveModelPath('GWAS_101.json');
      expect(path).toBe('/data/genetic_models/trait/GWAS_101.json');
    });

    it('should resolve CPIC drug models to drug folder', () => {
      const path = resolveModelPath('CPIC_drug_abacavir_2.json');
      expect(path).toBe('/data/genetic_models/drug/CPIC_drug_abacavir_2.json');
    });

    it('should resolve CPIC gene models to gene folder', () => {
      const path = resolveModelPath('CPIC_gene_ABCB1_96.json');
      expect(path).toBe('/data/genetic_models/gene/CPIC_gene_ABCB1_96.json');
    });

    it('should resolve CPIC guideline models to guideline folder', () => {
      const path = resolveModelPath('CPIC_GL_CYP2D6_unknown_100413.json');
      expect(path).toBe('/data/genetic_models/guideline/CPIC_GL_CYP2D6_unknown_100413.json');
    });

    it('should resolve PharmGKB models to variant folder', () => {
      const path = resolveModelPath('PharmGKB_CA_CA_PA267.json');
      expect(path).toBe('/data/genetic_models/variant/PharmGKB_CA_CA_PA267.json');
    });

    it('should handle colon-separated format', () => {
      const path = resolveModelPath('drug:simvastatin');
      expect(path).toBe('/data/genetic_models/drug/simvastatin.json');
    });

    it('should handle model ID without extension', () => {
      const path = resolveModelPath('GWAS_101');
      expect(path).toBe('/data/genetic_models/trait/GWAS_101.json');
    });
  });

  describe('validateModel', () => {
    it('should validate a complete model', () => {
      const rawData = {
        id: 'test-model',
        domain: 'trait',
        gene: 'CYP2D6',
        drug: null,
        rsid: 'rs1234',
        phenotype: 'Test phenotype',
        effect: null,
        evidence_level: 'high',
        odds_ratio: 1.5,
        pvalue: 0.001,
        confidence_interval: null,
        source: 'GWAS',
        source_url: null,
        last_updated: '2024-01-01',
        references: [],
      };

      const model = validateModel(rawData, 'test-ref');

      expect(model.id).toBe('test-model');
      expect(model.domain).toBe('trait');
      expect(model.gene).toBe('CYP2D6');
      expect(model.evidence_level).toBe('high');
    });

    it('should throw for missing id', () => {
      const rawData = { domain: 'trait' };
      expect(() => validateModel(rawData, 'test-ref')).toThrow("missing or invalid 'id'");
    });

    it('should throw for missing domain/category', () => {
      const rawData = { id: 'test' };
      expect(() => validateModel(rawData, 'test-ref')).toThrow("missing 'domain' or 'category'");
    });

    it('should handle legacy category field', () => {
      const rawData = {
        id: 'legacy-model',
        category: 'trait',
        snps: [{ rsid: 'rs123', riskAllele: 'A', weight: 1.0 }],
        interpretation: { low: 'Low risk', medium: 'Medium risk', high: 'High risk' },
      };

      const model = validateModel(rawData, 'test-ref');

      expect(model.id).toBe('legacy-model');
      expect(model.domain).toBe('trait');
      expect(model.snps).toHaveLength(1);
      expect(model.interpretation).toBeDefined();
    });

    it('should handle null values correctly', () => {
      const rawData = {
        id: 'null-model',
        domain: 'drug',
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
        last_updated: '2024-01-01',
        references: [],
      };

      const model = validateModel(rawData, 'test-ref');

      expect(model.gene).toBeNull();
      expect(model.drug).toBeNull();
      expect(model.odds_ratio).toBeNull();
    });

    it('should throw for non-object input', () => {
      expect(() => validateModel(null, 'test-ref')).toThrow('not an object');
      expect(() => validateModel('string', 'test-ref')).toThrow('not an object');
      expect(() => validateModel(123, 'test-ref')).toThrow('not an object');
    });
  });
});
