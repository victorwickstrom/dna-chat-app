### Task 20: Implement a wrapper for communicating with the DNA parsing worker.

1. Create `src/utils/workerWrapper.ts`. This file will wrap the worker and provide a function to parse a file while reporting progress:

   ```ts
   import { Metadata } from '../models/Metadata'

   interface ParseResult {
     index: Map<string, string>
     metadata: Metadata
   }

   export function parseDNA(
     file: File,
     onProgress: (progress: number) => void
   ): Promise<ParseResult> {
     return new Promise((resolve, reject) => {
       const worker = new Worker(new URL('../workers/parseDNA.ts', import.meta.url), {
         type: 'module',
       })
       worker.onmessage = (event) => {
         const { type, value, index, metadata, error } = event.data
         if (type === 'progress') {
           onProgress(value)
         } else if (type === 'result') {
           // Convert entries array back into Map
           const map = new Map(index)
           resolve({ index: map, metadata })
           worker.terminate()
         } else if (type === 'error') {
           reject(error)
           worker.terminate()
         }
       }
       worker.postMessage({ file })
     })
   }
   ```

2. This wrapper creates a worker instance, listens for `progress` and `result` messages, forwards progress to the caller, and resolves the promise with the parsed index and metadata.
3. Update `FileUpload.tsx` to import and use this `parseDNA` function instead of calling the worker directly.
