### Task 71: Write tests for IndexedDB storage functions.

1. Create `src/tests/storage.test.ts`.
2. Import `saveSNPIndex`, `loadSNPIndex`, and `clearData` from `src/storage/index`.
3. Before each test, call `clearData()` to reset the database.
4. Create a sample `Map` of a few SNPs and sample metadata, save it using `saveSNPIndex`. Then load it with `loadSNPIndex` and assert that the returned map and metadata match the input.
5. Test that `clearData` removes all records by calling `loadSNPIndex` afterward and expecting empty results.
