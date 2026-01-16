import type { MatchResult } from '../models/MatchResult'
import type { Preferences } from '../context/AppContext'
import type { QueryPlan } from '../models/queryPlan'
import { generateMemorySummary, userContext } from '../dna/UserGeneticContext'
import { 
  TraitRegistry, 
  processQuestionThroughGate,
  generateGatedPromptSection,
  type TraitEvaluationResult,
  type GatedResponse,
} from '../traits'
import { formatCSRForPrompt, type CompactSNPInfo } from '../snpedia'

const formatTopics = (memory: Record<string, number> | undefined, language: string) => {
  if (!memory)
    return language === 'en' ? 'No stored topic preferences.' : 'Inga sparade topic-vikter.'
  const sorted = Object.entries(memory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
  if (sorted.length === 0) {
    return language === 'en' ? 'No stored topic preferences.' : 'Inga sparade topic-vikter.'
  }
  return sorted.map(([topic, weight]) => `${topic}: ${weight.toFixed(2)}`).join(', ')
}

/**
 * Format trait evaluation results for LLM context
 * These are DETERMINISTIC results - the LLM explains, it does NOT decide.
 */
const formatTraitResults = (language: string): string => {
  const results = TraitRegistry.getAllCachedResults()
  if (results.length === 0) {
    return language === 'en' 
      ? 'No trait evaluations available.' 
      : 'Inga trait-utvärderingar tillgängliga.'
  }
  
  const evaluated = results.filter(r => r.can_evaluate && r.classification)
  if (evaluated.length === 0) {
    return language === 'en'
      ? 'Traits defined but no matching SNPs found in DNA data.'
      : 'Traits definierade men inga matchande SNP:er hittades i DNA-data.'
  }
  
  const lines: string[] = []
  lines.push(language === 'en' ? 'DETERMINISTIC TRAIT RESULTS:' : 'DETERMINISTISKA TRAIT-RESULTAT:')
  lines.push(language === 'en' 
    ? '(These are computed by rules - explain them, do NOT change them)'
    : '(Dessa är beräknade av regler - förklara dem, ÄNDRA INTE)')
  lines.push('')
  
  for (const result of evaluated) {
    const c = result.classification!
    lines.push(`**${result.trait_title}**`)
    lines.push(`  Klassificering: ${c.label}`)
    lines.push(`  Konfidens: ${c.confidence}`)
    lines.push(`  SNPs använda: ${result.snp_matches.filter(s => s.found && s.effect).map(s => `${s.rsid} (${s.genotype})`).join(', ')}`)
    lines.push(`  Beskrivning: ${c.description}`)
    lines.push('')
  }
  
  return lines.join('\n')
}

export interface ChatHistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

const formatChatHistory = (history: ChatHistoryMessage[], language: string, maxMessages: number = 10): string => {
  if (!history || history.length === 0) {
    return language === 'en' ? 'No previous messages.' : 'Inga tidigare meddelanden.'
  }
  
  // Take last N messages to maintain conversation context
  const recent = history.slice(-maxMessages)
  
  const formattedMessages = recent.map((msg, index) => {
    const role = msg.role === 'user' 
      ? (language === 'en' ? 'User' : 'Användare')
      : (language === 'en' ? 'Assistant' : 'Assistent')
    // Truncate long messages but keep enough context
    const content = msg.content.length > 800 
      ? msg.content.substring(0, 800) + '...'
      : msg.content
    return `[${index + 1}. ${role}]: ${content}`
  }).join('\n\n---\n\n')
  
  // Add a summary of what the conversation is about
  const lastAssistantMsg = [...recent].reverse().find(m => m.role === 'assistant')
  
  let topicHint = ''
  if (lastAssistantMsg) {
    // Extract likely topic from last assistant message
    const lowerContent = lastAssistantMsg.content.toLowerCase()
    if (lowerContent.includes('cancer')) topicHint = 'cancer/onkologi'
    else if (lowerContent.includes('hjärt') || lowerContent.includes('kardio')) topicHint = 'hjärt-kärl'
    else if (lowerContent.includes('diabetes')) topicHint = 'diabetes/metabolism'
    else if (lowerContent.includes('livsstil') || lowerContent.includes('kost')) topicHint = 'livsstilsfaktorer'
    else if (lowerContent.includes('stress') || lowerContent.includes('comt')) topicHint = 'stresshantering'
    else if (lowerContent.includes('sömn') || lowerContent.includes('dygn') || lowerContent.includes('kronotyp')) topicHint = 'sömn/dygnsrytm'
    else if (lowerContent.includes('gluten') || lowerContent.includes('celiaki')) topicHint = 'glutenkänslighet'
  }
  
  const contextNote = language === 'en' 
    ? `\n\n[CURRENT TOPIC: ${topicHint || 'general genetics'}. Continue on this topic unless user explicitly changes subject.]`
    : `\n\n[AKTUELLT ÄMNE: ${topicHint || 'allmän genetik'}. Fortsätt på detta ämne om inte användaren explicit byter.]`
  
  return formattedMessages + contextNote
}

export const buildInterpreterUserPrompt = (
  question: string,
  plan: QueryPlan,
  match: MatchResult,
  memory: { topicWeights?: Record<string, number> } | undefined,
  prefs: Preferences,
  chatHistory?: ChatHistoryMessage[],
  csrData?: CompactSNPInfo[]
): string => {
  const language = prefs.language ?? 'sv'
  const topics = formatTopics(memory?.topicWeights, language)
  const planJson = JSON.stringify(plan, null, 2)
  const matchJson = JSON.stringify(match, null, 2)

  const questionLabel = language === 'en' ? 'User question' : 'Användarens fråga'
  const geneticsLabel = language === 'en' ? 'Genetic data' : 'Genetiska data'
  const preferencesLabel = language === 'en' ? 'Preferences' : 'Preferenser'
  const contextLabel = language === 'en' ? 'Context' : 'Kontext'
  const memoryLabel = language === 'en' ? 'User Genetic Memory' : 'Användarens genetiska minne'
  const instruction =
    language === 'en'
      ? `Please interpret the genetic data in relation to the question. Use the User Genetic Memory to maintain context from previous conversations. Do NOT invent SNPs - only reference SNPs that appear in the memory or match data. Emphasize uncertainty, avoid diagnostic or prescriptive language, and respond with JSON containing the fields answer_markdown, key_points, uncertainty, used_snps, what_this_does_not_mean, follow_up_questions.`
      : `Tolka genetiska datan i relation till frågan. Använd användarens genetiska minne för att behålla kontext från tidigare konversationer. HITTA INTE PÅ SNP:er - referera endast till SNP:er som finns i minnet eller matchdatan. Betona osäkerhet, undvik diagnostiskt eller preskriptivt språk och svara med JSON som innehåller fälten answer_markdown, key_points, uncertainty, used_snps, what_this_does_not_mean, follow_up_questions.`

  const prefsLine = `${language === 'en' ? 'Explanation level' : 'Förklaringsnivå'} = ${prefs.explanationLevel}, ${
    language === 'en' ? 'tone' : 'ton'
  } = ${prefs.tone}, ${language === 'en' ? 'show uncertainty' : 'visa osäkerhet'} = ${prefs.showUncertainty}`

  // Include genetic memory context if available
  const geneticMemory = userContext.dnaHash ? generateMemorySummary() : (language === 'en' ? 'No DNA data uploaded yet.' : 'Ingen DNA-data uppladdad ännu.')
  
  // Include deterministic trait results
  const traitResults = formatTraitResults(language)
  const traitLabel = language === 'en' ? 'Trait Evaluations' : 'Trait-utvärderingar'
  
  // Format chat history for context
  const chatHistoryLabel = language === 'en' ? 'Previous conversation' : 'Tidigare konversation'
  const formattedHistory = chatHistory ? formatChatHistory(chatHistory, language) : ''
  
  // Format CSR (Canonical SNP Records) - low-token enriched SNP data
  const csrLabel = language === 'en' ? 'SNP Knowledge (from SNPedia)' : 'SNP-kunskap (från SNPedia)'
  const formattedCSR = csrData && csrData.length > 0 
    ? formatCSRForPrompt(csrData)
    : (language === 'en' ? 'No enriched SNP data available.' : 'Ingen berikad SNP-data tillgänglig.')

  return `${questionLabel}: ${question.trim()}
${preferencesLabel}: ${prefsLine}
${contextLabel}: ${topics}

${chatHistoryLabel}:
"""
${formattedHistory}
"""

${csrLabel}:
"""
${formattedCSR}
"""

${memoryLabel}:
"""
${geneticMemory}
"""

${traitLabel}:
"""
${traitResults}
"""

${geneticsLabel}:

Plan:
"""
${planJson}
"""

Match:
"""
${matchJson}
"""

${instruction}

VIKTIGT: Om användaren ställer en följdfråga (som "vilka andra faktorer?", "berätta mer", "vad menar du?"), MÅSTE du svara i kontext av den tidigare konversationen. Läs "Tidigare konversation" ovan för att förstå vad användaren refererar till.`
}

export const buildInterpreterSystemPrompt = (language: string = 'sv'): string => {
  if (language === 'en') {
    return `You are a friendly genetics specialist having a natural conversation with someone curious about their DNA.

YOUR ROLE:
- Explain genetic concepts in a clear, pedagogical way
- Use the genetic data provided to give personalized insights
- Be warm, helpful, and educational
- Make complex genetics accessible and interesting

CONVERSATION STYLE:
- Read the "Previous conversation" section first to understand context
- If the user asks a follow-up question, continue on the same topic
- Reference what you discussed before: "As I mentioned about your cancer risk..."
- Be conversational, not robotic

GUIDELINES:
- Use the SNPs and trait results provided in the data
- When no specific data exists, give helpful general information
- Always remind that genetics is just one factor - lifestyle matters too
- Never give medical diagnoses, but you can discuss what research shows

Respond in JSON with: answer_markdown, key_points, uncertainty, used_snps, what_this_does_not_mean, follow_up_questions.`
  }

  return `Du är en vänlig genetikspecialist som för en naturlig konversation med någon som är nyfiken på sitt DNA.

DIN ROLL:
- Förklara genetiska koncept på ett tydligt, pedagogiskt sätt
- Använd den genetiska datan som finns för att ge personliga insikter
- Var varm, hjälpsam och lärorik
- Gör komplex genetik tillgänglig och intressant

KONVERSATIONSSTIL:
- Läs "Tidigare konversation" först för att förstå kontexten
- Om användaren ställer en följdfråga, fortsätt på samma ämne
- Referera till vad du diskuterat: "Som jag nämnde om din cancerrisk..."
- Var samtalande, inte robotisk

RIKTLINJER:
- Använd de SNP:er och trait-resultat som finns i datan
- När specifik data saknas, ge hjälpsam generell information
- Påminn alltid om att genetik bara är en faktor - livsstil spelar också roll
- Ge aldrig medicinska diagnoser, men du kan diskutera vad forskning visar

Svara i JSON med: answer_markdown, key_points, uncertainty, used_snps, what_this_does_not_mean, follow_up_questions.`
}
