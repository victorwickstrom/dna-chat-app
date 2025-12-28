### Task 27: Implement a file hash computation.

1. In `src/utils/hash.ts`, implement an async function `computeHash(file: File): Promise<string>`:
   ```ts
   export async function computeHash(file: File): Promise<string> {
     const buffer = await file.arrayBuffer()
     const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
     const hashArray = Array.from(new Uint8Array(hashBuffer))
     const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
     return hashHex
   }
   ```
2. Use this function in the worker (Task 19) to compute the file's SHA-256 hash before decompression. Include this hash in the metadata sent back.
3. The hash is used to check for duplicates and identify previously parsed files.
