import { useEffect, useRef, useState } from 'react'
import { useGlobalContext } from '../context/AppContext'
import { callInterpreter, callPlanner } from '../services/llm'
import { buildInterpreterSystemPrompt, buildInterpreterUserPrompt, type ChatHistoryMessage } from '../utils/interpreter'
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
import { dnaState } from '../dna/dnaState'
import { addConversationMessage, userContext } from '../dna/UserGeneticContext'
import { processQuestionThroughGate, generateGatedPromptSection } from '../traits'
import { getRelevantCSRsForQuestion, initSNPedia } from '../snpedia'
import { learnFromQuestion, initGlobalLearning } from '../learning'

interface Message {
  id: number
  sender: 'user' | 'assistant'
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
  'The planner failed. Kindly explain that no exact answer can be given and suggest broad genetic themes the user can explore.'

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const { snpIndex, preferences, pendingQuestion, setPendingQuestion } = useGlobalContext()
  const listRef = useRef<HTMLDivElement>(null)
  
  // Initialize SNPedia and Global Learning on mount
  useEffect(() => {
    initSNPedia()
    initGlobalLearning()
  }, [])

  const appendMessage = (sender: Message['sender'], content: string) => {
    setMessages((prev) => [...prev, { id: Date.now() + Math.random(), sender, content }])
    // Track in persistent memory
    addConversationMessage(sender === 'user' ? 'user' : 'assistant', content)
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
      appendMessage('assistant', safetyMessage)
      setIsSending(false)
      return
    }

    try {
      // =======================================================================
      // PREPARE SNPEDIA CONTEXT: Fetch relevant SNP data BEFORE sending to AI
      // This ensures we have accurate reference data for the AI to use
      // =======================================================================
      let snpediaContext = ''
      try {
        const contextResponse = await fetch('/api/learning/prepare-context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question }),
        })
        if (contextResponse.ok) {
          const contextData = await contextResponse.json()
          snpediaContext = contextData.context_for_ai || ''
          if (contextData.cached_count > 0) {
            console.log(`[Chat] Prepared SNPedia context: ${contextData.cached_count} SNPs for topics: ${contextData.detected_topics.join(', ')}`)
          }
        }
      } catch (contextError) {
        console.warn('[Chat] Could not fetch SNPedia context:', contextError)
      }
      
      // =======================================================================
      // GLOBAL LEARNING: Auto-expand knowledge base based on question
      // =======================================================================
      const learningResult = await learnFromQuestion(question)
      if (learningResult.snps_added.length > 0) {
        console.log(`[Chat] Learning: Added ${learningResult.snps_added.length} new SNPs for topics: ${learningResult.topics_detected.join(', ')}`)
      }
      
      // =======================================================================
      // TRAIT GATE: Process question through deterministic trait engine FIRST
      // =======================================================================
      const gatedResponse = processQuestionThroughGate(question, snpIndex)
      
      // Generate the gated prompt section (trait result, fallback instructions, or empty)
      // NOTE: Gate no longer blocks - it provides context for how LLM should respond
      const gatedSection = generateGatedPromptSection(gatedResponse, preferences.language)
      
      console.log('[Chat] Gate response:', {
        mode: gatedResponse.mode,
        hasTrait: !!gatedResponse.trait_result,
        activeTraitId: gatedResponse.active_trait_id,
      })
      
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
          'assistant',
          'The planner could not process the question right now. I will try to give a more general answer instead.'
        )
      }


      const matchResult = matchQueryPlan(plan, snpIndex)
      
      // Convert messages to chat history format for context
      const chatHistory: ChatHistoryMessage[] = messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.content
      }))
      
      // Fetch relevant CSR (Canonical SNP Records) for this question
      // This is low-token enriched data from SNPedia cache
      const csrData = snpIndex 
        ? await getRelevantCSRsForQuestion(question, snpIndex, 5)
        : []
      
      // Build interpreter prompt WITH the gated trait result, chat history, CSR data, AND SNPedia context
      const interpreterPrompt = [
        buildInterpreterSystemPrompt(preferences.language),
        // Insert the gated section (trait result) BEFORE the user prompt
        gatedSection,
        // Insert SNPedia reference data for accurate responses
        snpediaContext,
        buildInterpreterUserPrompt(
          usedFallback ? fallbackQuestion : question,
          plan,
          matchResult,
          memorySnapshot,
          preferences,
          chatHistory,  // Pass chat history for context
          csrData       // Pass CSR data for enriched SNP knowledge
        ),
      ].filter(Boolean).join('\n\n')

      try {
        const interpreterResponse = await callInterpreter(interpreterPrompt, preferences.language)
        const renderInterpreterResponse = (res: InterpreterResponse) => {
          const sections: string[] = []

          sections.push(res.answer_markdown)

          if (res.key_points && res.key_points.length > 0) {
            sections.push(
              '**Key Points:**\n' + res.key_points.map((p: string) => `- ${p}`).join('\n')
            )
          }

          if (res.uncertainty) {
            const uncertaintyLabel = {
              low: 'Low uncertainty',
              medium: 'Moderate uncertainty',
              high: 'High uncertainty',
            }[res.uncertainty]
            sections.push(`**Uncertainty:** ${uncertaintyLabel}`)
          }

          if (res.used_snps && res.used_snps.length > 0) {
            const tableHeader = '| rsid | genotype | evidence |\n|------|----------|----------|'
            const tableRows = res.used_snps
              .map(
                (s: { rsid: string; genotype: string | null; evidence?: string }) =>
                  `| ${s.rsid} | ${s.genotype ?? 'null'} | ${s.evidence ?? 'N/A'} |`
              )
              .join('\n')
            sections.push('**Used SNPs:**\n' + [tableHeader, tableRows].join('\n'))
          }

          if (res.what_this_does_not_mean && res.what_this_does_not_mean.length > 0) {
            sections.push(
              '**What this does NOT mean:**\n' +
                res.what_this_does_not_mean.map((p: string) => `- ${p}`).join('\n')
            )
          }

          if (res.follow_up_questions && res.follow_up_questions.length > 0) {
            sections.push(
              '**Follow-up Questions:**\n' +
                res.follow_up_questions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')
            )
          }

          return sections.join('\n\n')
        }

        await updateKnowledgeGraph(plan, interpreterResponse)
        const rendered = renderInterpreterResponse(interpreterResponse)
        appendMessage('assistant', rendered)
      } catch (interpreterError) {
        console.error(interpreterError)
        appendMessage(
          'assistant',
          'The interpreter could not generate a response. Please try again or rephrase your question.'
        )
      }
    } finally {
      setIsSending(false)
    }
  }

  // Check for existing risk chat message on mount (in case event fired before mount)
  const [hasLoadedInitialMessage, setHasLoadedInitialMessage] = useState(false)
  
  useEffect(() => {
    if (!hasLoadedInitialMessage && dnaState.riskChatMessage) {
      setMessages([{ id: Date.now(), sender: 'assistant', content: dnaState.riskChatMessage }])
      setHasLoadedInitialMessage(true)
    }
  }, [hasLoadedInitialMessage])

  // Listen for DNA analysis complete and add risk chat message
  useEffect(() => {
    const handleAnalysisComplete = (event: Event) => {
      const detail = (event as CustomEvent).detail
      const chatMessage = detail?.riskChatMessage || dnaState.riskChatMessage
      
      if (chatMessage) {
        setMessages((prev) => {
          // Avoid duplicate messages
          if (prev.some(m => m.content === chatMessage)) return prev
          return [...prev, { id: Date.now() + Math.random(), sender: 'assistant', content: chatMessage }]
        })
      }
    }

    window.addEventListener('dna-analysis-complete', handleAnalysisComplete)
    return () => {
      window.removeEventListener('dna-analysis-complete', handleAnalysisComplete)
    }
  }, [])

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages])

  // Handle pending questions from findings panel
  useEffect(() => {
    if (pendingQuestion && !isSending) {
      setInput(pendingQuestion)
      setPendingQuestion(null)
      // Auto-submit after a short delay to show the question first
      setTimeout(() => {
        const submitBtn = document.querySelector('[data-chat-submit]') as HTMLButtonElement
        if (submitBtn) submitBtn.click()
      }, 100)
    }
  }, [pendingQuestion, isSending, setPendingQuestion])

  return (
    <div className="flex h-full flex-col bg-white">
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-sm text-slate-500">
            Start by asking a question about your genetics, or click on a finding in the right panel to learn more.
          </p>
        )}
        {messages.map((message) => (
          <ChatMessage key={message.id} sender={message.sender} content={message.content} />
        ))}
      </div>
      <div className="flex items-center border-t border-slate-200 p-3">
        <input
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          placeholder="Ask about inflammation, neurodiversity, diet..."
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={isSending}
          onKeyDown={(event) => event.key === 'Enter' && handleSend()}
        />
        <button
          data-chat-submit
          className="ml-3 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          disabled={isSending}
          onClick={handleSend}
        >
          {isSending ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  )
}

export default Chat
