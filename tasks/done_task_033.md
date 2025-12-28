### Task 33: Enhance the FileUpload component with drag-and-drop support.

1. Wrap the input element in a `<div>` that handles drag events. Use `onDragEnter`, `onDragOver`, and `onDrop` to style the drop area and process files.
2. Example code snippet:
   ```tsx
   const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
     e.preventDefault()
     e.stopPropagation()
     const { files } = e.dataTransfer
     handleFiles(files)
   }
   return (
     <div
       className="border-2 border-dashed border-gray-400 p-4 rounded-md text-center"
       onDragOver={(e) => {
         e.preventDefault()
         e.stopPropagation()
         e.dataTransfer.dropEffect = 'copy'
       }}
       onDrop={handleDrop}
     >
       <p>Drag and drop your DNA file here or click to select</p>
       <input
         type="file"
         accept=".txt,.zip,.gz"
         onChange={(e) => handleFiles(e.target.files)}
         className="hidden"
         ref={fileInputRef}
       />
     </div>
   )
   ```
3. When the area is clicked, trigger the hidden file input via `fileInputRef.current?.click()`.
4. This improves the user experience and makes file uploading intuitive.
