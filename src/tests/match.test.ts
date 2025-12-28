import { matchQueryPlan } from '../utils/match'
import type { QueryPlan } from '../models/queryPlan'

describe('matchQueryPlan', () => {
  const samplePlan: QueryPlan = {
    version: '1.0',
    intent: 'explore_gene',
    topic: 'inflammation',
    snps: [
      { rsid: 'rs123', gene: 'IL6', reason: 'Test', evidence: 'moderate', priority: 1 },
      { rsid: 'rs456', gene: 'TNF', reason: 'Test', evidence: 'strong', priority: 2 },
      { rsid: 'rs789', gene: 'CRP', reason: 'Test', evidence: 'weak', priority: 3 },
    ],
    includeNotes: [],
    safety: { diagnosis: false, medicalAdvice: false, disclaimerLevel: 'low' },
  }

  it('should return genotypes for matching SNPs', () => {
    const index = new Map<string, string | null>([
      ['rs123', 'AT'],
      ['rs456', 'GG'],
      ['rs789', 'CC'],
    ])

    const result = matchQueryPlan(samplePlan, index)

    expect(result['rs123'].genotype).toBe('AT')
    expect(result['rs456'].genotype).toBe('GG')
    expect(result['rs789'].genotype).toBe('CC')
  })

  it('should preserve evidence levels from plan', () => {
    const index = new Map<string, string | null>([['rs123', 'AT']])

    const result = matchQueryPlan(samplePlan, index)

    expect(result['rs123'].evidence).toBe('moderate')
    expect(result['rs456'].evidence).toBe('strong')
    expect(result['rs789'].evidence).toBe('weak')
  })

  it('should return null for missing SNPs', () => {
    const index = new Map<string, string | null>([['rs123', 'AT']])

    const result = matchQueryPlan(samplePlan, index)

    expect(result['rs123'].genotype).toBe('AT')
    expect(result['rs456'].genotype).toBeNull()
    expect(result['rs789'].genotype).toBeNull()
  })

  it('should handle null index', () => {
    const result = matchQueryPlan(samplePlan, null)

    expect(result['rs123'].genotype).toBeNull()
    expect(result['rs456'].genotype).toBeNull()
    expect(result['rs789'].genotype).toBeNull()
  })

  it('should handle undefined index', () => {
    const result = matchQueryPlan(samplePlan, undefined)

    expect(result['rs123'].genotype).toBeNull()
  })

  it('should handle empty SNPs list', () => {
    const emptyPlan: QueryPlan = {
      ...samplePlan,
      snps: [],
    }
    const index = new Map<string, string | null>([['rs123', 'AT']])

    const result = matchQueryPlan(emptyPlan, index)

    expect(Object.keys(result).length).toBe(0)
  })

  it('should handle SNPs with null genotypes in index', () => {
    const index = new Map<string, string | null>([
      ['rs123', null],
      ['rs456', 'GG'],
    ])

    const result = matchQueryPlan(samplePlan, index)

    expect(result['rs123'].genotype).toBeNull()
    expect(result['rs456'].genotype).toBe('GG')
  })
})
