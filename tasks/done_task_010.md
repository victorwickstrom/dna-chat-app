### Task 10: Create the main App component skeleton.

1. In `src/App.tsx`, create a functional React component that serves as the top-level component:

   ```tsx
   import React from 'react'
   import FileUpload from './components/FileUpload'
   import Chat from './components/Chat'

   const App: React.FC = () => {
     return (
       <div className="min-h-screen bg-gray-50 flex flex-col">
         {/* Header */}
         <header className="p-4 bg-blue-600 text-white text-center font-bold text-xl">
           DNA Chat Assistant
         </header>
         {/* Main content */}
         <main className="p-4 flex-1 flex flex-col items-center">
           <FileUpload />
           <div className="w-full max-w-2xl mt-8">
             <Chat />
           </div>
         </main>
       </div>
     )
   }

   export default App
   ```

2. This layout includes a header, the file upload section at the top, and the chat area below. Tailwind CSS classes provide basic styling.
