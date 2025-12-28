### Task 42: Define the MatchResult interface.

1. Create `src/models/MatchResult.ts`. Define:
   ```ts
   export interface MatchResult {
     [rsid: string]: {
       genotype: string | null
       evidence: 'weak' | 'moderate' | 'strong'
     }
   }
   ```
2. Import and use this type wherever a MatchResult is expected (e.g., in `matchQueryPlan`).
