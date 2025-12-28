import { buildInterpreterSystemPrompt, buildInterpreterUserPrompt } from '../utils/interpreter'
import type { QueryPlan } from '../models/queryPlan'
import type { MatchResult } from '../models/MatchResult'

describe('buildInterpreterSystemPrompt', () => {
  it('should return Swedish prompt by default', () => {
    const prompt = buildInterpreterSystemPrompt('sv')

    expect(prompt).toContain('genetikutbildare')
    expect(prompt).toContain('JSON')
  })

  it('should return English prompt when language is en', () => {
    const prompt = buildInterpreterSystemPrompt('en')

    expect(prompt).toContain('genetics educator')
    expect(prompt).toContain('JSON')
  })

  it('should instruct to avoid diagnosis', () => {
    const svPrompt = buildInterpreterSystemPrompt('sv')
    const enPrompt = buildInterpreterSystemPrompt('en')

    expect(svPrompt.toLowerCase()).toContain('medicinska råd')
    expect(enPrompt.toLowerCase()).toContain('diagnostic')
  })

  it('should specify JSON response fields', () => {
    const prompt = buildInterpreterSystemPrompt('sv')

    expect(prompt).toContain('answer_markdown')
    expect(prompt).toContain('key_points')
    expect(prompt).toContain('uncertainty')
    expect(prompt).toContain('used_snps')
  })
})

describe('buildInterpreterUserPrompt', () => {
  const samplePlan: QueryPlan = {
    version: '1.0',
    intent: 'explore_gene',
    topic: 'inflammation',
    snps: [{ rsid: 'rs123', gene: 'IL6', reason: 'Test', evidence: 'moderate', priority: 1 }],
    includeNotes: [],
    safety: { diagnosis: false, medicalAdvice: false, disclaimerLevel: 'low' },
  }

  const sampleMatch: MatchResult = {
    rs123: { genotype: 'AT', evidence: 'moderate' },
  }

  const defaultPrefs = {
    explanationLevel: 'normal' as const,
    tone: 'calm' as const,
    showUncertainty: true,
    language: 'sv' as const,
    autoSendGenotypes: false,
  }

  const sampleMemory = {
    topicWeights: { inflammation: 5, metabolism: 3 },
  }

  it('should include the user question', () => {
    const prompt = buildInterpreterUserPrompt(
      'Vad säger mitt DNA?',
      samplePlan,
      sampleMatch,
      sampleMemory,
      defaultPrefs
    )

    expect(prompt).toContain('Vad säger mitt DNA?')
  })

  it('should include serialized plan', () => {
    const prompt = buildInterpreterUserPrompt(
      'Test',
      samplePlan,
      sampleMatch,
      sampleMemory,
      defaultPrefs
    )

    expect(prompt).toContain('rs123')
    expect(prompt).toContain('IL6')
    expect(prompt).toContain('inflammation')
  })

  it('should include serialized match', () => {
    const prompt = buildInterpreterUserPrompt(
      'Test',
      samplePlan,
      sampleMatch,
      sampleMemory,
      defaultPrefs
    )

    expect(prompt).toContain('AT')
    expect(prompt).toContain('moderate')
  })

  it('should include preferences', () => {
    const prompt = buildInterpreterUserPrompt(
      'Test',
      samplePlan,
      sampleMatch,
      sampleMemory,
      defaultPrefs
    )

    expect(prompt).toContain('normal')
    expect(prompt).toContain('calm')
  })

  it('should include topic context', () => {
    const prompt = buildInterpreterUserPrompt(
      'Test',
      samplePlan,
      sampleMatch,
      sampleMemory,
      defaultPrefs
    )

    expect(prompt).toContain('inflammation')
  })

  it('should use Swedish labels when language is sv', () => {
    const prompt = buildInterpreterUserPrompt(
      'Test',
      samplePlan,
      sampleMatch,
      sampleMemory,
      defaultPrefs
    )

    expect(prompt).toContain('Användarens fråga')
    expect(prompt).toContain('Genetiska data')
  })

  it('should use English labels when language is en', () => {
    const enPrefs = { ...defaultPrefs, language: 'en' as const }
    const prompt = buildInterpreterUserPrompt(
      'Test',
      samplePlan,
      sampleMatch,
      sampleMemory,
      enPrefs
    )

    expect(prompt).toContain('User question')
    expect(prompt).toContain('Genetic data')
  })

  it('should handle empty memory', () => {
    const prompt = buildInterpreterUserPrompt(
      'Test',
      samplePlan,
      sampleMatch,
      undefined,
      defaultPrefs
    )

    expect(prompt).toBeDefined()
    expect(typeof prompt).toBe('string')
  })
})
