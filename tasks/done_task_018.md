### Task 18: Implement decompression functions.

    1. Create `src/utils/decompress.ts`. Import JSZip and pako at the top:
       ```ts
       import JSZip from 'jszip'
       import pako from 'pako'
       ```
    2. Implement `async function decompressZip(file: File): Promise<string[]>`:
       - Use `JSZip.loadAsync(file)` to read the zip file.
       - Find the first file within the archive that ends with `.txt` and extract its contents using `file.async('string')`.
       - Split the contents by newline (`

`) and return an array of lines.
    3. Implement `async function decompressGzip(buffer: ArrayBuffer): Promise<string[]>`:
       - Use `pako.ungzip(new Uint8Array(buffer), { to: 'string' })`to decompress the buffer.
       - Split the resulting string into lines.
    4. Implement`async function readFileAsLines(file: File): Promise<string[]>`that decides whether to decompress or read directly:
       - If the file name ends with`.zip`, call `decompressZip(file)`.
       - If it ends with `.gz`, read the `ArrayBuffer`with`file.arrayBuffer()`and call`decompressGzip`.
       - Otherwise, read the file as text with `file.text()` and split into lines. 5. Export these functions for use in the worker.
