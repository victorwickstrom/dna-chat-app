### Task 32: Implement controls to clear DNA data.

1. Provide a button or link in the `FileUpload` component or in a dedicated settings area that allows the user to remove their DNA data from the browser.
2. When clicked, call `clearData()` from your storage module (Task 26) to delete both the `snpIndex` and `metadata` stores.
3. Clear relevant context state (e.g., set `snpIndex` and `metadata` to `null`). Reset progress to 0.
4. Display a confirmation prompt to ensure the user understands this action will remove all genetic data stored locally.
