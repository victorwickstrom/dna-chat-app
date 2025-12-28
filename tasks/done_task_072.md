### Task 72: Write tests for progress reporting in the worker.

1. Create `src/tests/progress.test.ts`.
2. Use the `parseDNA` wrapper to parse a small test file. Provide a mock function for `onProgress` that collects progress values.
3. Assert that the progress values are monotonically increasing and that the final progress reported is `100`.
4. Use a file with enough lines to ensure at least two progress events are emitted.
5. Clean up the worker after the test to avoid memory leaks.
