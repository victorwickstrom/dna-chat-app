import type { InterpreterResponse } from '../models/interpreter'
import type { QueryPlan } from '../models/queryPlan'
import { validateQueryPlan } from '../utils/validateQueryPlan'

// Backend API configuration
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || ''

interface ChoiceMessage {
  message?: { content?: string }
  text?: string
}

type ChoicePayload = { choices: ChoiceMessage[] }

const isChoicePayload = (payload: unknown): payload is ChoicePayload => {
  return (
    !!payload &&
    typeof payload === 'object' &&
    'choices' in payload &&
    Array.isArray((payload as ChoicePayload).choices)
  )
}

const extractContent = (payload: unknown): string => {
  if (typeof payload === 'string') {
    return payload
  }

  if (isChoicePayload(payload)) {
    const firstChoice = payload.choices[0]
    const content = firstChoice?.message?.content ?? firstChoice?.text
    if (typeof content === 'string') {
      return content
    }
  }

  throw new Error('Planner response saknar giltigt innehåll.')
}

const callBackendAPI = async (systemPrompt: string, userPrompt: string): Promise<string> => {
  console.log('Calling backend API:', BACKEND_URL)
  
  const response = await fetch(`${BACKEND_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Backend API error:', response.status, errorText)
    throw new Error(`Backend API request failed: ${response.status} ${response.statusText}`)
  }

  const payload = await response.json()
  console.log('Backend API response received')
  return extractContent(payload)
}

export const callPlanner = async (prompt: string, language = 'sv'): Promise<QueryPlan> => {
  const langInstruction = language === 'sv' 
    ? 'IMPORTANT: All text fields must be in Swedish.' 
    : 'IMPORTANT: All text fields must be in English.'
  
  const systemPrompt = `You are a genetics query planner. Given a user question about genetics, return a JSON object with the following structure:
{
  "version": "1.0",
  "intent": "string describing the intent",
  "topic": "string topic category",
  "snps": [{ "rsid": "rsXXXX", "gene": "GENE", "reason": "why relevant", "evidence": "weak|moderate|strong", "priority": 1 }],
  "includeNotes": [],
  "safety": { "diagnosis": false, "medicalAdvice": false, "disclaimerLevel": "low|medium|high" }
}
Return ONLY valid JSON, no markdown or explanations.
${langInstruction}`

  const content = await callBackendAPI(systemPrompt, prompt)
  
  try {
    // Extract JSON from response (handle potential markdown wrapping)
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }
    const parsed = JSON.parse(jsonMatch[0])
    return validateQueryPlan(parsed)
  } catch (err) {
    console.error('Planner parse error:', err, 'Content:', content)
    throw new Error('Planner returnerade ogiltig JSON.')
  }
}

export const callInterpreter = async (prompt: string, language = 'sv'): Promise<InterpreterResponse> => {
  const langInstruction = language === 'sv'
    ? 'VIKTIGT: Skriv ALLT innehåll på svenska. Alla textfält, förklaringar, nyckelpunkter och följdfrågor ska vara på svenska.'
    : 'IMPORTANT: Write ALL content in English.'
  
  const systemPrompt = `You are a genetics educator. Given genetic data and a question, provide an educational response in JSON format:
{
  "answer_markdown": "## Rubrik\\n\\nMarkdown-formaterat svar på svenska...",
  "key_points": ["punkt 1", "punkt 2"],
  "uncertainty": "low|moderate|high",
  "used_snps": [{ "rsid": "rsXXX", "genotype": "XX", "evidence": "string" }],
  "what_this_does_not_mean": ["begränsning 1", "begränsning 2"],
  "follow_up_questions": ["fråga 1", "fråga 2"]
}
Return ONLY valid JSON, no markdown wrapping. Always include medical disclaimers.
${langInstruction}`

  const content = await callBackendAPI(systemPrompt, prompt)
  
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }
    return JSON.parse(jsonMatch[0]) as InterpreterResponse
  } catch (err) {
    console.error('Interpreter parse error:', err, 'Content:', content)
    throw new Error('Interpreter returnerade ogiltig JSON.')
  }
}
