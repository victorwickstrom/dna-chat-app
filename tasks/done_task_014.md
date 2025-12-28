### Task 14: Implement the Chat component skeleton.

1. Create `src/components/Chat.tsx`. Define the state for messages and input:

   ```tsx
   import React, { useState } from 'react'
   import { useGlobalContext } from '../context/AppContext'

   interface Message {
     id: number
     sender: 'user' | 'system'
     content: string
   }

   const Chat: React.FC = () => {
     const [messages, setMessages] = useState<Message[]>([])
     const [input, setInput] = useState('')
     const { snpIndex } = useGlobalContext()

     const handleSend = async () => {
       if (!input.trim()) return
       const userMessage: Message = {
         id: Date.now(),
         sender: 'user',
         content: input.trim(),
       }
       setMessages((prev) => [...prev, userMessage])
       setInput('')
       // Call planner and interpreter later (see subsequent tasks)
     }

     return (
       <div className="flex flex-col h-full border border-gray-300 rounded-md">
         <div className="flex-1 overflow-y-auto p-2 space-y-2">
           {messages.map((msg) => (
             <div
               key={msg.id}
               className={msg.sender === 'user' ? 'text-right' : 'text-left text-blue-800'}
             >
               <div
                 className={
                   'inline-block p-2 rounded-md ' +
                   (msg.sender === 'user' ? 'bg-blue-100' : 'bg-gray-200')
                 }
               >
                 {msg.content}
               </div>
             </div>
           ))}
         </div>
         <div className="p-2 border-t border-gray-300 flex">
           <input
             className="flex-1 border border-gray-300 rounded p-2"
             type="text"
             value={input}
             placeholder="Ask about your DNA..."
             onChange={(e) => setInput(e.target.value)}
             onKeyDown={(e) => e.key === 'Enter' && handleSend()}
           />
           <button className="ml-2 bg-blue-600 text-white px-4 py-2 rounded" onClick={handleSend}>
             Send
           </button>
         </div>
       </div>
     )
   }

   export default Chat
   ```

2. This component sets up the UI for a chat window and collects user input. In later tasks, you will integrate calls to the planner and interpreter and append system responses to the message list.
