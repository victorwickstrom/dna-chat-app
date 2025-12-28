### Task 69: Write tests for genotype normalization.

1. Create `src/tests/normalize.test.ts`.
2. Import `normalizeGenotype` from `src/utils/normalize`.
3. Test various inputs:
   - `'AC'` returns `'AC'`
   - `'CA'` returns `'AC'`
   - `'TT'` returns `'TT'`
   - `''` returns `null` or `''` (based on your implementation)
   - `null` returns `null`
4. Use Jest's `expect` assertions for equality.
