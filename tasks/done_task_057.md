### Task 57: Implement export and import of local memory.

1. Implement `exportMemory()` in your storage module. It should gather `preferences`, `topicWeights`, `knowledgeGraph`, and `conversationSummaries` and return a JSON object. Convert it to a Blob and trigger a download in the browser (e.g., create a temporary `<a>` element and call `.click()`).
2. Implement `importMemory(file: File)`. Read the file as text, parse JSON, validate that it contains the expected keys. If valid, write each store back to IndexedDB. Update context state accordingly.
3. In your settings page, add buttons to export and import. Use an `<input type="file">` for import.
4. Provide error handling for invalid or corrupted import files.
