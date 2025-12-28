### Task 17: Implement genotype normalization.

1. Create `src/utils/normalize.ts`. Export a function `normalizeGenotype(genotype: string | null): string | null` that ensures consistent ordering of alleles:
   ```ts
   export function normalizeGenotype(genotype: string | null): string | null {
     if (!genotype) return null
     // If genotype consists of two letters, sort them alphabetically (case-insensitive)
     if (genotype.length === 2) {
       const [a, b] = genotype.toUpperCase().split('')
       return a <= b ? `${a}${b}` : `${b}${a}`
     }
     // For single allele (e.g., `I` for insertion or deletion), return uppercase
     return genotype.toUpperCase()
   }
   ```
2. Call this function on each genotype during parsing to ensure that `'AC'` and `'CA'` are treated equivalently.
