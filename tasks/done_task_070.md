### Task 70: Write tests for DNA parsers.

1. Create `src/tests/parsers.test.ts`.
2. Use small sample files for each vendor with 3–5 lines of data. Place these files in a folder like `src/tests/data`.
3. Create helper functions in your test to call the vendor-specific parsing functions (you may need to export them from the worker or replicate logic for testing).
4. Parse each sample and assert that the resulting `Map` has the correct number of SNPs and correct normalized genotypes.
5. Test that comment lines and empty lines are ignored.
