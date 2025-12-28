### Task 41: Match QueryPlan SNPs to the local index.

1. Create a function `matchQueryPlan(plan: QueryPlan, index: Map<string, string | null>): MatchResult` in `src/utils/match.ts`.
2. Iterate over `plan.snps` and, for each SNP, look up its `rsid` in `index`:
   ```ts
   export interface MatchResult {
     [rsid: string]: {
       genotype: string | null
       evidence: 'weak' | 'moderate' | 'strong'
     }
   }
   export function matchQueryPlan(plan: QueryPlan, index: Map<string, string | null>): MatchResult {
     const result: MatchResult = {}
     for (const snp of plan.snps) {
       const genotype = index.get(snp.rsid) ?? null
       result[snp.rsid] = {
         genotype,
         evidence: snp.evidence,
       }
     }
     return result
   }
   ```
3. Return an object mapping each requested `rsid` to an object containing the genotype (or null) and evidence level. Use this result when building the interpreter prompt.
