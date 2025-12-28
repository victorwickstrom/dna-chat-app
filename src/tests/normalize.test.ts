import { normalizeGenotype } from '../utils/normalize'

describe('normalizeGenotype', () => {
  it('should return sorted genotype for AC', () => {
    expect(normalizeGenotype('AC')).toBe('AC')
  })

  it('should sort CA to AC', () => {
    expect(normalizeGenotype('CA')).toBe('AC')
  })

  it('should keep TT unchanged', () => {
    expect(normalizeGenotype('TT')).toBe('TT')
  })

  it('should return null for empty string', () => {
    expect(normalizeGenotype('')).toBeNull()
  })

  it('should return null for null input', () => {
    expect(normalizeGenotype(null)).toBeNull()
  })

  it('should return null for undefined input', () => {
    expect(normalizeGenotype(undefined)).toBeNull()
  })

  it('should handle lowercase input', () => {
    expect(normalizeGenotype('gt')).toBe('GT')
  })

  it('should sort GT to GT (already sorted)', () => {
    expect(normalizeGenotype('GT')).toBe('GT')
  })

  it('should sort TG to GT', () => {
    expect(normalizeGenotype('TG')).toBe('GT')
  })

  it('should handle genotypes with slash separator', () => {
    expect(normalizeGenotype('A/T')).toBe('AT')
  })

  it('should handle single allele', () => {
    expect(normalizeGenotype('A')).toBe('A')
  })
})
