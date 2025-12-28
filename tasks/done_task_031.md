### Task 31: Provide error handling for unsupported files.

1. In `FileUpload.tsx`, validate the selected file's extension. If it is not `.txt`, `.zip`, or `.gz`, display an error message and do not proceed.
2. Catch errors thrown by `parseDNA` (e.g., due to unknown vendor or corrupted file) and display a user-friendly message.
3. Ensure the UI resets the progress bar and does not leave the user in an inconsistent state after an error.
4. You can use try/catch blocks around the `await parseDNA(...)` call and set a local `error` state to display any error messages.
