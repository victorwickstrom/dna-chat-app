### Task 19: Create a Web Worker for DNA parsing.

1. Create `src/workers/parseDNA.ts` (note: Vite supports TypeScript workers if you reference with `new Worker(new URL(...))`). Inside this file:
   - Import `readFileAsLines` from `../utils/decompress`.
   - Import `detectVendor` from `../utils/vendor` and `normalizeGenotype` from `../utils/normalize`.
   - Define type definitions for messages: the worker should expect a message containing `{ file: File }` and optional callbacks for progress.
   - Use `self.onmessage = async (event) => { ... }` to handle messages.
2. In the handler:
   - Use `await readFileAsLines(file)` to obtain all lines.
   - Call `detectVendor` on the first 10–20 lines to decide vendor.
   - Based on the vendor, parse the lines. For each line that is not a comment (does not start with `#`), split by comma or tab according to vendor specification to extract `rsid` and `genotype`. Normalize the genotype.
   - Store results in a `Map<string, string | null>`.
   - Periodically post progress to the main thread via `postMessage({ type: 'progress', value: percentage })` every 50,000 lines or 0.5% progress.
   - After parsing, post the final result via `postMessage({ type: 'result', index: <entries>, metadata: { vendor, count, fileName, uploadDate, hash } })`.
   - Use `crypto.subtle.digest('SHA-256', ...)` to compute the file hash from the raw ArrayBuffer (do this before decompressing for consistency).
3. Export nothing from the worker file; Vite will wrap it automatically.
