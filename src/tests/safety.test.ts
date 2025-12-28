import { classifyQuestion, containsPII, isDiagnostic, isPrescriptive } from '../utils/safety'

describe('Safety classifier', () => {
  describe('containsPII', () => {
    it('should detect email addresses', () => {
      expect(containsPII('My email is user@example.com')).toBe(true)
    })

    it('should detect phone numbers', () => {
      expect(containsPII('Call me at 123-456-7890')).toBe(true)
    })

    it('should detect credit card numbers', () => {
      expect(containsPII('My card is 1234-5678-9012-3456')).toBe(true)
    })

    it('should return false for normal text', () => {
      expect(containsPII('What does my DNA say about inflammation?')).toBe(false)
    })
  })

  describe('isDiagnostic', () => {
    it('should detect "Do I have" questions', () => {
      expect(isDiagnostic('Do I have autism?')).toBe(true)
    })

    it('should detect "Am I" diagnostic questions', () => {
      expect(isDiagnostic('Am I diagnosed with diabetes?')).toBe(true)
    })

    it('should detect disease names', () => {
      expect(isDiagnostic('Does my DNA show cancer risk?')).toBe(true)
    })

    it('should detect Swedish diagnostic questions', () => {
      expect(isDiagnostic('Har jag diabetes?')).toBe(true)
    })

    it('should return false for non-diagnostic questions', () => {
      expect(isDiagnostic('What can my DNA tell me about metabolism?')).toBe(false)
    })
  })

  describe('isPrescriptive', () => {
    it('should detect "Should I take" questions', () => {
      expect(isPrescriptive('Should I take medication X?')).toBe(true)
    })

    it('should detect "What medication" questions', () => {
      expect(isPrescriptive('What medication should I use?')).toBe(true)
    })

    it('should detect "cure" questions', () => {
      expect(isPrescriptive('Can I cure my condition?')).toBe(true)
    })

    it('should detect Swedish prescriptive questions', () => {
      expect(isPrescriptive('Bör jag ta detta läkemedel?')).toBe(true)
    })

    it('should return false for non-prescriptive questions', () => {
      expect(isPrescriptive('What does rs123 mean?')).toBe(false)
    })
  })

  describe('classifyQuestion', () => {
    it('should classify diagnostic questions', () => {
      const result = classifyQuestion('Do I have autism?')
      expect(result.diagnostic).toBe(true)
      expect(result.prescriptive).toBe(false)
      expect(result.pii).toBe(false)
    })

    it('should classify prescriptive questions', () => {
      const result = classifyQuestion('Should I take medication X?')
      expect(result.prescriptive).toBe(true)
    })

    it('should classify PII questions', () => {
      const result = classifyQuestion('My email is user@example.com')
      expect(result.pii).toBe(true)
    })

    it('should classify normal questions with all false', () => {
      const result = classifyQuestion('What can my DNA tell me about metabolism?')
      expect(result.diagnostic).toBe(false)
      expect(result.prescriptive).toBe(false)
      expect(result.pii).toBe(false)
    })

    it('should detect multiple flags', () => {
      const result = classifyQuestion(
        'Do I have cancer and should I take chemo? Email me at test@test.com'
      )
      expect(result.diagnostic).toBe(true)
      expect(result.pii).toBe(true)
    })
  })
})
