### Task 23: Implement AncestryDNA parser logic inside the worker.

AncestryDNA raw data files are comma-separated and include a header. Implement this logic:

1. Skip the first line if it contains `AncestryDNA Raw Data` or begins with `#`.
2. For each subsequent line:
   ```ts
   const [rsid, chromosome, position, genotype] = line.split(',')
   if (!rsid || !genotype) continue
   const normalized = normalizeGenotype(genotype)
   snpMap.set(rsid.trim(), normalized)
   ```
3. Many Ancestry files use uppercase letters for genotypes already; normalization is still applied for consistency.
4. Post progress messages and final results the same way as other vendors.
