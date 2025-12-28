### Task 28: Store metadata alongside the SNP index.

1. Include metadata such as vendor, file name, number of SNPs, hash, and upload date in a `Metadata` object.
2. In the worker's result message (Task 19), send `metadata` along with the `index`. Example metadata:
   ```ts
   {
     vendor: 'myheritage',
     fileName: file.name,
     count: snpMap.size,
     hash: computedHash,
     uploadDate: new Date().toISOString()
   }
   ```
3. In the `parseDNA` wrapper (Task 20), when receiving the result, save this metadata along with the SNP index into IndexedDB via `saveSNPIndex` (Task 26).
4. Provide functions `getMetadata()` to retrieve metadata without loading the entire index, useful for displaying summary information.
