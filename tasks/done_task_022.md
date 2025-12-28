### Task 22: Implement 23andMe DNA parser logic inside the worker.

In the `parseDNA.ts` worker file, implement parsing for 23andMe files:

1. 23andMe raw data files are tab-separated (TSV) and have columns: `rsid	chromosome	position	genotype`. Comments begin with `#`.
2. For each non-comment line:
   ```ts
   const [rsid, chromosome, position, genotype] = line.split('	')
   if (!rsid || !genotype) continue
   const normalized = normalizeGenotype(genotype)
   snpMap.set(rsid.trim(), normalized)
   ```
3. Continue to send progress events periodically.
4. Keep track of how many lines have been parsed for progress percentage.
