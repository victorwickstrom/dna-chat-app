import { buildPlannerSystemPrompt, buildPlannerUserPrompt } from '../utils/planner'

describe('buildPlannerSystemPrompt', () => {
  it('should return Swedish prompt by default', () => {
    const prompt = buildPlannerSystemPrompt('sv')

    expect(prompt).toContain('JSON')
    expect(prompt).toContain('genetikplanerare')
  })

  it('should return English prompt when language is en', () => {
    const prompt = buildPlannerSystemPrompt('en')

    expect(prompt).toContain('JSON')
    expect(prompt).toContain('genetics query planner')
  })

  it('should instruct not to ask for genotype data', () => {
    const svPrompt = buildPlannerSystemPrompt('sv')
    const enPrompt = buildPlannerSystemPrompt('en')

    expect(svPrompt.toLowerCase()).toContain('genotypdata')
    expect(enPrompt.toLowerCase()).toContain('genotype')
  })

  it('should specify SNP format', () => {
    const prompt = buildPlannerSystemPrompt('sv')

    expect(prompt).toContain('rsid')
    expect(prompt).toContain('gene')
    expect(prompt).toContain('evidence')
  })
})

describe('buildPlannerUserPrompt', () => {
  const defaultPrefs = {
    explanationLevel: 'normal' as const,
    tone: 'calm' as const,
    showUncertainty: true,
    language: 'sv' as const,
    autoSendGenotypes: false,
  }

  const defaultMemory = {
    topicWeights: { inflammation: 5, metabolism: 3 },
  }

  it('should include the user question', () => {
    const prompt = buildPlannerUserPrompt(
      'Vad säger mitt DNA om inflammation?',
      defaultMemory,
      defaultPrefs
    )

    expect(prompt).toContain('inflammation')
  })

  it('should include preferences', () => {
    const prompt = buildPlannerUserPrompt('Test question', defaultMemory, defaultPrefs)

    expect(prompt.toLowerCase()).toContain('normal')
    expect(prompt.toLowerCase()).toContain('calm')
  })

  it('should include topic weights from memory', () => {
    const prompt = buildPlannerUserPrompt('Test question', defaultMemory, defaultPrefs)

    expect(prompt).toContain('inflammation')
  })

  it('should use Swedish labels when language is sv', () => {
    const prompt = buildPlannerUserPrompt('Test', defaultMemory, {
      ...defaultPrefs,
      language: 'sv',
    })

    expect(prompt).toContain('Fråga')
  })

  it('should use English labels when language is en', () => {
    const prompt = buildPlannerUserPrompt('Test', defaultMemory, {
      ...defaultPrefs,
      language: 'en',
    })

    expect(prompt).toContain('Question')
  })

  it('should handle empty memory', () => {
    const prompt = buildPlannerUserPrompt('Test', {}, defaultPrefs)

    expect(prompt).toBeDefined()
    expect(typeof prompt).toBe('string')
  })
})
