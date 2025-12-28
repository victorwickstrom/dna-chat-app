import type { MatchResult } from '../models/MatchResult'
import type { Preferences } from '../context/AppContext'
import type { QueryPlan } from '../models/queryPlan'

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

export const buildInterpreterUserPrompt = (
  question: string,
  plan: QueryPlan,
  match: MatchResult,
  memory: { topicWeights?: Record<string, number> } | undefined,
  prefs: Preferences
): string => {
  const language = prefs.language ?? 'sv'
  const topics = formatTopics(memory?.topicWeights, language)
  const planJson = JSON.stringify(plan, null, 2)
  const matchJson = JSON.stringify(match, null, 2)

  const questionLabel = language === 'en' ? 'User question' : 'Användarens fråga'
  const geneticsLabel = language === 'en' ? 'Genetic data' : 'Genetiska data'
  const preferencesLabel = language === 'en' ? 'Preferences' : 'Preferenser'
  const contextLabel = language === 'en' ? 'Context' : 'Kontext'
  const instruction =
    language === 'en'
      ? `Please interpret the genetic data in relation to the question. Emphasize uncertainty, avoid diagnostic or prescriptive language, and respond with JSON containing the fields answer_markdown, key_points, uncertainty, used_snps, what_this_does_not_mean, follow_up_questions.`
      : `Tolka genetiska datan i relation till frågan. Betona osäkerhet, undvik diagnostiskt eller preskriptivt språk och svara med JSON som innehåller fälten answer_markdown, key_points, uncertainty, used_snps, what_this_does_not_mean, follow_up_questions.`

  const prefsLine = `${language === 'en' ? 'Explanation level' : 'Förklaringsnivå'} = ${prefs.explanationLevel}, ${
    language === 'en' ? 'tone' : 'ton'
  } = ${prefs.tone}, ${language === 'en' ? 'show uncertainty' : 'visa osäkerhet'} = ${prefs.showUncertainty}`

  return `${questionLabel}: ${question.trim()}
${preferencesLabel}: ${prefsLine}
${contextLabel}: ${topics}
${geneticsLabel}:

Plan:
"""
${planJson}
"""

Match:
"""
${matchJson}
"""

${instruction}`
}

export const buildInterpreterSystemPrompt = (language: string = 'sv'): string => {
  if (language === 'en') {
    return `You are a genetics educator that interprets local genotype summaries.
- DNA never leaves the user's device; only minimal rsid/genotype info is supplied.
- Emphasize uncertainty, evidence strength, and possible confounders.
- Avoid deterministic or diagnostic statements; never prescribe treatments.
- Respond in JSON with the keys: answer_markdown, key_points, uncertainty, used_snps, what_this_does_not_mean, follow_up_questions.`
  }

  return `Du är en genetikutbildare som tolkar genetiska signaler utifrån en fråga.
- Rå-DNA lämnar aldrig användarens dator, endast ett fåtal rsid/genotyp-sammanfattningar skickas.
- Betona osäkerhet och evidensnivåer och varna för möjliga feltolkningar.
- Undvik deterministiska påståenden och ge inga medicinska råd.
- Svara i JSON med nycklarna: answer_markdown, key_points, uncertainty, used_snps, what_this_does_not_mean, follow_up_questions.`
}
