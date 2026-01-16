import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ChatMessageProps {
  sender: 'user' | 'assistant'
  content: string
}

const ChatMessage = ({ sender, content }: ChatMessageProps) => {
  const isUser = sender === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-2xl rounded-2xl px-4 py-3 text-sm ${
          isUser ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'
        }`}
      >
        {isUser ? (
          content
        ) : (
          <div className="prose prose-sm prose-slate max-w-none prose-headings:text-slate-900 prose-headings:font-semibold prose-h2:text-base prose-h3:text-sm prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-table:text-xs prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1 prose-strong:text-slate-900">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatMessage
