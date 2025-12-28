### Task 21: Implement MyHeritage DNA parser logic inside the worker.

Inside the `parseDNA.ts` worker file:

1. For MyHeritage raw files, lines are comma-separated and usually have columns: `rsid,chromosome,position,genotype`. Skip any line that begins with `#` or empty lines.
2. For each valid line, do:
   ```ts
   const [rsid, chrom, pos, genotype] = line.split(',')
   if (!rsid || !genotype) continue
   const normalized = normalizeGenotype(genotype)
   snpMap.set(rsid.trim(), normalized)
   ```
3. Count the number of parsed SNPs to include in metadata.
4. Send progress messages periodically as described in Task 19.
5. Note that MyHeritage files might include extra whitespace; use `trim()` on each field.
