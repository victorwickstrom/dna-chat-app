### Task 68: Write tests for vendor detection.

1. Create `src/tests/vendor.test.ts`.
2. Define arrays of lines representing sample file headers for each vendor: MyHeritage, 23andMe, Ancestry, and unknown.
3. Import `detectVendor` from `src/utils/vendor`.
4. Call `detectVendor` on each array and assert that it returns the expected vendor string.
5. Include edge cases such as extra whitespace and unexpected formatting.
