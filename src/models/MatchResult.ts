export interface MatchResult {
  [rsid: string]: {
    genotype: string | null
    evidence: 'weak' | 'moderate' | 'strong'
  }
}
