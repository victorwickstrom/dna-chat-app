### Task 75: Write tests for match generation.

1. Create `src/tests/match.test.ts`.
2. Import `matchQueryPlan` and the `QueryPlan` and `MatchResult` types.
3. Create a sample `QueryPlan` with a few SNP entries and a sample `Map` representing the local SNP index.
4. Call `matchQueryPlan` and assert that the returned object has keys corresponding to the requested rsIDs and contains the expected genotypes and evidence levels.
5. Test the case where some SNPs are missing in the index; ensure their genotypes are `null`.
