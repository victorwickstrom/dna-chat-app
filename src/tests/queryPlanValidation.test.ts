import { validateQueryPlan } from '../utils/validateQueryPlan'

describe('validateQueryPlan', () => {
  const validPlan = {
    version: '1.0',
    intent: 'explore_gene',
    topic: 'inflammation',
    snps: [
      {
        rsid: 'rs123',
        gene: 'IL6',
        reason: 'Associated with inflammation',
        evidence: 'moderate',
        priority: 1,
      },
    ],
    includeNotes: [],
    safety: {
      diagnosis: false,
      medicalAdvice: false,
      disclaimerLevel: 'low',
    },
  }

  it('should not throw for a valid QueryPlan', () => {
    expect(() => validateQueryPlan(validPlan)).not.toThrow()
  })

  it('should return the validated plan', () => {
    const result = validateQueryPlan(validPlan)
    expect(result.version).toBe('1.0')
    expect(result.intent).toBe('explore_gene')
    expect(result.snps.length).toBe(1)
  })

  it('should throw for missing version', () => {
    const invalidPlan = { ...validPlan, version: undefined }
    expect(() => validateQueryPlan(invalidPlan)).toThrow()
  })

  it('should throw for missing intent', () => {
    const invalidPlan = { ...validPlan, intent: undefined }
    expect(() => validateQueryPlan(invalidPlan)).toThrow()
  })

  it('should throw for missing topic', () => {
    const invalidPlan = { ...validPlan, topic: undefined }
    expect(() => validateQueryPlan(invalidPlan)).toThrow()
  })

  it('should throw for missing safety', () => {
    const invalidPlan = { ...validPlan, safety: undefined }
    expect(() => validateQueryPlan(invalidPlan)).toThrow()
  })

  it('should throw for invalid snp format', () => {
    const invalidPlan = {
      ...validPlan,
      snps: [{ rsid: 'rs123' }], // missing required fields
    }
    expect(() => validateQueryPlan(invalidPlan)).toThrow()
  })

  it('should throw for invalid evidence level', () => {
    const invalidPlan = {
      ...validPlan,
      snps: [
        {
          rsid: 'rs123',
          gene: 'IL6',
          reason: 'test',
          evidence: 'invalid', // should be weak/moderate/strong
          priority: 1,
        },
      ],
    }
    expect(() => validateQueryPlan(invalidPlan)).toThrow()
  })

  it('should throw for null input', () => {
    expect(() => validateQueryPlan(null)).toThrow()
  })

  it('should throw for non-object input', () => {
    expect(() => validateQueryPlan('not an object')).toThrow()
  })
})
