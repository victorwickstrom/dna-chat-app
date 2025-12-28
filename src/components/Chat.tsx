import { useEffect, useRef, useState } from 'react'
import { useGlobalContext } from '../context/AppContext'
import { callInterpreter, callPlanner } from '../services/llm'
import { buildInterpreterSystemPrompt, buildInterpreterUserPrompt } from '../utils/interpreter'
import { matchQueryPlan } from '../utils/match'
import {
  buildPlannerSystemPrompt,
  buildPlannerUserPrompt,
  type PlannerMemory,
} from '../utils/planner'
import { getTopThreeTopics, updateTopicWeights } from '../utils/topicWeights'
import { updateKnowledgeGraph } from '../utils/knowledgeGraph'
import { classifyQuestion, getSafetyMessage } from '../utils/safety'
import type { QueryPlan } from '../models/queryPlan'
import type { InterpreterResponse } from '../models/interpreter'
import ChatMessage from './ChatMessage'

interface Message {
  id: number
  sender: 'user' | 'system'
  content: string
}

const fallbackPlan: QueryPlan = {
  version: '1.0',
  intent: 'planner_fallback',
  topic: 'general-genetics',
  snps: [],
  includeNotes: ['planner_error'],
  safety: {
    diagnosis: false,
    medicalAdvice: false,
    disclaimerLevel: 'high',
  },
}

const fallbackQuestion =
  'Planeraren misslyckades. Förklara vänligt att inget exakt svar kan ges och föreslå breda genetiska teman användaren kan utforska.'

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const { snpIndex, preferences } = useGlobalContext()
  const listRef = useRef<HTMLDivElement>(null)

  const appendMessage = (sender: Message['sender'], content: string) => {
    setMessages((prev) => [...prev, { id: Date.now() + Math.random(), sender, content }])
  }

  const handleSend = async () => {
    if (!input.trim() || isSending) return

    const question = input.trim()
    appendMessage('user', question)
    setInput('')
    setIsSending(true)

    const safetyCheck = classifyQuestion(question)
    const safetyMessage = getSafetyMessage(safetyCheck, preferences.language)
    if (safetyMessage) {
      appendMessage('system', safetyMessage)
      setIsSending(false)
      return
    }

    try {
      const topicWeights = await getTopThreeTopics()
      const memorySnapshot: PlannerMemory = { topicWeights }

      const plannerPrompt = `${buildPlannerSystemPrompt(preferences.language)}\n\n${buildPlannerUserPrompt(
        question,
        memorySnapshot,
        preferences
      )}`

      let plan: QueryPlan
      let usedFallback = false

      try {
        plan = await callPlanner(plannerPrompt, preferences.language)
        await updateTopicWeights(plan)
      } catch (plannerError) {
        console.error(plannerError)
        usedFallback = true
        plan = fallbackPlan
        appendMessage(
          'system',
          'Planeraren kunde inte behandla frågan just nu. Jag försöker istället ge ett mer övergripande svar.'
        )
      }


      const matchResult = matchQueryPlan(plan, snpIndex)
      const interpreterPrompt = [
        buildInterpreterSystemPrompt(preferences.language),
        buildInterpreterUserPrompt(
          usedFallback ? fallbackQuestion : question,
          plan,
          matchResult,
          memorySnapshot,
          preferences
        ),
      ].join('\n\n')

      try {
        const interpreterResponse = await callInterpreter(interpreterPrompt, preferences.language)
        const renderInterpreterResponse = (res: InterpreterResponse) => {
          const sections: string[] = []

          sections.push(res.answer_markdown)

          if (res.key_points && res.key_points.length > 0) {
            sections.push(
              '**Nyckelpunkter:**\n' + res.key_points.map((p: string) => `- ${p}`).join('\n')
            )
          }

          if (res.uncertainty) {
            const uncertaintyLabel = {
              low: 'Låg osäkerhet',
              medium: 'Måttlig osäkerhet',
              high: 'Hög osäkerhet',
            }[res.uncertainty]
            sections.push(`**Osäkerhet:** ${uncertaintyLabel}`)
          }

          if (res.used_snps && res.used_snps.length > 0) {
            const tableHeader = '| rsid | genotype | evidence |\n|------|----------|----------|'
            const tableRows = res.used_snps
              .map(
                (s: { rsid: string; genotype: string | null; evidence?: string }) =>
                  `| ${s.rsid} | ${s.genotype ?? 'null'} | ${s.evidence ?? 'N/A'} |`
              )
              .join('\n')
            sections.push('**Använda SNP:er:**\n' + [tableHeader, tableRows].join('\n'))
          }

          if (res.what_this_does_not_mean && res.what_this_does_not_mean.length > 0) {
            sections.push(
              '**Vad detta INTE betyder:**\n' +
                res.what_this_does_not_mean.map((p: string) => `- ${p}`).join('\n')
            )
          }

          if (res.follow_up_questions && res.follow_up_questions.length > 0) {
            sections.push(
              '**Följdfrågor:**\n' +
                res.follow_up_questions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')
            )
          }

          return sections.join('\n\n')
        }

        await updateKnowledgeGraph(plan, interpreterResponse)
        const rendered = renderInterpreterResponse(interpreterResponse)
        appendMessage('system', rendered)
      } catch (interpreterError) {
        console.error(interpreterError)
        appendMessage(
          'system',
          'Tolkaren kunde inte generera ett svar. Försök gärna igen eller formulera om din fråga.'
        )
      }
    } finally {
      setIsSending(false)
    }
  }

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages])

  return (
    <div className="flex h-[28rem] flex-col rounded-lg border border-slate-200 bg-white">
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-sm text-slate-500">
            Börja med att ställa en fråga om din genetik. Systemet planerar vilka SNP:er som behövs.
          </p>
        )}
        {messages.map((message) => (
          <ChatMessage key={message.id} sender={message.sender} content={message.content} />
        ))}
      </div>
      <div className="flex items-center border-t border-slate-200 p-3">
        <input
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          placeholder="Fråga något som inflammation, neurodiversitet eller kost..."
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={isSending}
          onKeyDown={(event) => event.key === 'Enter' && handleSend()}
        />
        <button
          className="ml-3 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          disabled={isSending}
          onClick={handleSend}
        >
          {isSending ? 'Skickar...' : 'Skicka'}
        </button>
      </div>
    </div>
  )
}

export default Chat
