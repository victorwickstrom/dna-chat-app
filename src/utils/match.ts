import type { MatchResult } from '../models/MatchResult'
import type { QueryPlan } from '../models/queryPlan'

export const matchQueryPlan = (
  plan: QueryPlan,
  index: Map<string, string | null> | null | undefined
): MatchResult => {
  const result: MatchResult = {}
  for (const snp of plan.snps) {
    result[snp.rsid] = {
      genotype: index?.get(snp.rsid) ?? null,
      evidence: snp.evidence,
    }
  }
  return result
}
