### Task 25: Implement progress reporting in the worker.

In `parseDNA.ts`, after reading the lines and determining the total count (`totalLines`), keep a counter `processedLines`. After parsing each line, increment `processedLines` and check if `processedLines / totalLines * 100` has advanced by at least 0.5 percentage points since the last report. If it has, post a message to the main thread:

```ts
postMessage({ type: 'progress', value: (processedLines / totalLines) * 100 })
```

This throttles the frequency of progress updates to avoid overwhelming the main thread. Always ensure that the final progress message before sending the result shows 100%.
