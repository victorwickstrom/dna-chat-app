### Task 29: Check for existing index before parsing.

1. In the file upload handling (Task 13), compute the hash of the selected file using `computeHash` (Task 27).
2. Call `loadSNPIndex()` from storage to retrieve existing metadata (Task 26). If the stored metadata's `hash` matches the computed hash:
   - Skip parsing; load the existing SNP index from IndexedDB and set it in context.
   - Set progress to 100% and show a message like `"DNA file already processed."`.
3. If the hashes do not match, proceed with parsing by sending the file to the worker. After parsing, save the new index and metadata.
4. This avoids unnecessary reprocessing when the same file is uploaded multiple times.
