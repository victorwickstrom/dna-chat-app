export interface UsedSnp {
  rsid: string
  genotype: string | null
  evidence: 'weak' | 'moderate' | 'strong'
}

export interface InterpreterResponse {
  answer_markdown: string
  key_points: string[]
  uncertainty: 'low' | 'medium' | 'high'
  used_snps: UsedSnp[]
  what_this_does_not_mean: string[]
  follow_up_questions: string[]
}
