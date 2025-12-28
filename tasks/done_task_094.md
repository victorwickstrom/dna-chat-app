### Task 94: Optimize parsing for large files.

1. Tune the parsing loop in the worker (`parseDNA.ts`) to process lines in chunks instead of all at once to avoid blocking. For instance, use `for (let i = 0; i < lines.length; i++) { ... if (i % 100000 === 0) { await new Promise((r) => setTimeout(r, 0)) } }` to yield control back to the browser.
2. Adjust the frequency of progress updates: for very large files (millions of lines), report progress every 100,000 lines or every 1% increment, whichever is smaller.
3. Monitor memory usage by ensuring that temporary arrays (like the full list of lines) are released as soon as possible. When decompressing ZIP or GZIP content, process the text in streaming mode if supported.
4. Test with large DNA files (50–100 MB) to ensure that the UI remains responsive and the progress bar updates smoothly.
5. Document any performance considerations in `docs/architecture.md`.
