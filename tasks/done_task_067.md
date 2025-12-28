### Task 67: Write tests for decompression utilities.

1. Create `src/tests/decompress.test.ts`.
2. Use the `fs` module within tests to read small test files (e.g., a pre-created zip file and a gzip file in `src/tests/data`).
3. Import your functions `decompressZip` and `decompressGzip` from `src/utils/decompress`.
4. Assert that the returned arrays of lines match expected arrays for known test files.
5. Use async/await and `expect` to handle promises.
