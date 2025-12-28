const piiPatterns = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/i,
  /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/,
  /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/,
  /\b\d{6,12}\b/,
  /\b\d{2,4}[-/]\d{2}[-/]\d{2,4}\b.*(?:birth|born|föd)/i,
  /personnummer|social\s*security|ssn/i,
]

// Only block actual disease diagnosis requests, not genetics trait questions
const diagnosticPatterns = [
  /\b(do|does)\s+i\s+(have|got|suffer from|diagnosed with)\s+(cancer|diabetes|alzheimer|parkinson|schizophrenia|epilepsy|heart\s*disease|stroke|dementia)/i,
  /\b(har jag|lider jag av)\s+(cancer|diabetes|alzheimer|parkinson|schizofreni|epilepsi|hjärtsjukdom|stroke|demens)/i,
  /\bdiagnos(era|eras|erad)?\b/i,
  /\bam\s+i\s+(sick|ill|dying)/i,
  /\bär\s+jag\s+(sjuk|döende)/i,
]

const prescriptivePatterns = [
  /\b(should|shall|can|could)\s+i\s+(take|stop|start|use|try|cure)/i,
  /\b(bör|ska|kan)\s+jag\s+(ta|sluta|börja|använda|prova|bota)/i,
  /\b(what|which)\s+(medication|medicine|drug|treatment|therapy|dose)/i,
  /\b(vilken|vilket)\s+(medicin|läkemedel|behandling|dos)/i,
  /\b(cure|treat|heal|fix)\s+(my|this|the)/i,
  /\b(bota|behandla|läka)\s+(min|mitt|det)/i,
]

export const containsPII = (question: string): boolean => {
  return piiPatterns.some((pattern) => pattern.test(question))
}

export const isDiagnostic = (question: string): boolean => {
  return diagnosticPatterns.some((pattern) => pattern.test(question))
}

export const isPrescriptive = (question: string): boolean => {
  return prescriptivePatterns.some((pattern) => pattern.test(question))
}

export interface SafetyClassification {
  pii: boolean
  diagnostic: boolean
  prescriptive: boolean
}

export const classifyQuestion = (question: string): SafetyClassification => {
  return {
    pii: containsPII(question),
    diagnostic: isDiagnostic(question),
    prescriptive: isPrescriptive(question),
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getSafetyMessage = (classification: SafetyClassification, language: string): string | null => {
  // Safety blocking disabled - AI will handle disclaimers in responses
  return null
}
