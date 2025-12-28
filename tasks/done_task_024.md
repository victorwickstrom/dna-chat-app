### Task 24: Normalize genotypes during parsing.

Within each vendor-specific parser in `parseDNA.ts` (Tasks 21–23), call the `normalizeGenotype` function from `src/utils/normalize` on each genotype string. This ensures consistent ordering (e.g., `GT` → `GT` and `TG` → `GT`) and case. Always check for `null` or empty genotype values before adding them to the map.
