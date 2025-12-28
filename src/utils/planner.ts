import type { Preferences } from '../context/AppContext'

/**
 * Minimal representation of the local memory model relevant for planner prompts.
 * `topicWeights` mirrors memory_store.topic_weights to surface the user's focus areas.
 */
export interface PlannerMemory {
  topicWeights?: Record<string, number>
}

const swedishSystemPrompt = `Du är en genetikplanerare som returnerar JSON.
Följ reglerna:
- Svara endast med ett JSON-objekt med nycklarna: version, intent, topic, snps, include_notes, safety.
- Lista högst 30 SNP:er. Varje SNP är ett objekt { "rsid": "...", "gene": "...", "reason": "...", "evidence": "weak|moderate|strong", "priority": 1 }.
- Begär aldrig genotypdata från användaren.
- Ange safety med { "diagnosis": boolean, "medical_advice": boolean, "disclaimer_level": "low|medium|high" }.
- Inkludera eventuella extra noter i include_notes (t.ex. "population_bias").`

const englishSystemPrompt = `You are a genetics query planner that must respond with JSON only.
Rules:
- Respond with an object containing: version, intent, topic, snps, include_notes, safety.
- List at most 30 SNPs. Each SNP is { "rsid": "...", "gene": "...", "reason": "...", "evidence": "weak|moderate|strong", "priority": 1 }.
- Never ask for genotype data.
- Provide "safety": { "diagnosis": boolean, "medical_advice": boolean, "disclaimer_level": "low|medium|high" }.
- Add optional context notes in include_notes (e.g. "population_bias").`

/**
 * Builds the planner system prompt, defaulting to Swedish instructions.
 */
export const buildPlannerSystemPrompt = (language: string = 'sv'): string => {
  return language === 'en' ? englishSystemPrompt : swedishSystemPrompt
}

const formatTopics = (memory?: PlannerMemory): string => {
  if (!memory?.topicWeights) {
    return 'Inga tidigare fokusområden tillgängliga.'
  }

  const sorted = Object.entries(memory.topicWeights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic, weight]) => `${topic}: ${weight.toFixed(2)}`)

  return sorted.length > 0 ? sorted.join(', ') : 'Inga tidigare fokusområden tillgängliga.'
}

/**
 * Builds the user prompt that the planner model consumes.
 * Includes the user's preferences and the most recent topic memory for grounding.
 */
export const buildPlannerUserPrompt = (
  question: string,
  memory: PlannerMemory,
  prefs: Preferences
): string => {
  const language = prefs.language ?? 'sv'
  const baseLabel = language === 'en' ? 'Question' : 'Fråga'
  const prefsLabel = language === 'en' ? 'Preferences' : 'Preferenser'
  const contextLabel = language === 'en' ? 'Context' : 'Kontext'

  const toneText = language === 'en' ? `tone: ${prefs.tone}` : `ton: ${prefs.tone}`
  const explanationText =
    language === 'en'
      ? `explanation level: ${prefs.explanationLevel}`
      : `förklaringsnivå: ${prefs.explanationLevel}`

  return `${baseLabel}: ${question.trim()}
${prefsLabel}: ${explanationText}, ${toneText}
${contextLabel}: ${formatTopics(memory)}
`
}
