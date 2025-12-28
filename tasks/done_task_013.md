### Task 13: Implement the FileUpload component.

1. Create `src/components/FileUpload.tsx`. Import the necessary React hooks:

   ```tsx
   import React, { useRef, useState } from 'react'
   import { parseDNA } from '../utils/workerWrapper'
   import { useGlobalContext } from '../context/AppContext'

   const FileUpload: React.FC = () => {
     const fileInputRef = useRef<HTMLInputElement | null>(null)
     const [progress, setProgress] = useState(0)
     const { setSnpIndex, setMetadata } = useGlobalContext()

     const handleFiles = async (files: FileList | null) => {
       if (!files || files.length === 0) return
       const file = files[0]
       try {
         const result = await parseDNA(file, (p: number) => setProgress(p))
         setSnpIndex(result.index)
         setMetadata(result.metadata)
       } catch (err) {
         console.error(err)
         alert('Failed to parse DNA file. Please ensure it is a supported format.')
       }
     }

     return (
       <div className="w-full max-w-md p-4 border border-gray-300 rounded-md shadow-sm">
         <input
           type="file"
           accept=".txt,.zip,.gz"
           onChange={(e) => handleFiles(e.target.files)}
           ref={fileInputRef}
           className="w-full border border-gray-300 rounded-md p-2"
         />
         {progress > 0 && (
           <div className="mt-2 w-full bg-gray-200 h-3 rounded">
             <div className="bg-blue-500 h-3 rounded" style={{ width: `${progress}%` }}></div>
           </div>
         )}
       </div>
     )
   }

   export default FileUpload
   ```

2. This component uses an `<input type="file">` element to accept `.txt`, `.zip`, or `.gz` files. Upon selection, it calls `parseDNA` from a wrapper (defined in Task 20) to process the file in a Web Worker, updating progress via state and storing the results in context.
3. You can enhance the styling or wrap the `<input>` with a drag-and-drop area as needed.
