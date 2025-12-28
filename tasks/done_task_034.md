### Task 34: Implement the chat message rendering logic.

1. Create a dedicated `ChatMessage.tsx` component in `src/components` that accepts a `message` prop with properties `sender` and `content`.
2. Use conditional classes to align and style messages differently for the user and the assistant:

   ```tsx
   interface ChatMessageProps {
     sender: 'user' | 'system'
     content: string
   }

   const ChatMessage: React.FC<ChatMessageProps> = ({ sender, content }) => {
     const isUser = sender === 'user'
     return (
       <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
         <div
           className={`max-w-sm p-2 rounded-md ${
             isUser ? 'bg-blue-100 text-right' : 'bg-gray-200'
           }`}
         >
           {content}
         </div>
       </div>
     )
   }

   export default ChatMessage
   ```

3. Replace the inline mapping in `Chat.tsx` with `<ChatMessage>` components to improve readability and maintainability.
