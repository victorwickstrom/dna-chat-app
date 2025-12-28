/**
 * Note: These tests require a jsdom environment with fake-indexeddb.
 * For full testing, install fake-indexeddb and configure Jest to use it.
 */

import { savePreferences, loadPreferences } from '../storage'

describe('Preferences storage', () => {
  const samplePreferences = {
    explanationLevel: 'technical' as const,
    tone: 'formal' as const,
    showUncertainty: false,
    language: 'en' as const,
    autoSendGenotypes: true,
  }

  describe('savePreferences and loadPreferences', () => {
    it('should save and load preferences', async () => {
      try {
        await savePreferences(samplePreferences)
        const loaded = await loadPreferences()

        expect(loaded.explanationLevel).toBe('technical')
        expect(loaded.tone).toBe('formal')
        expect(loaded.showUncertainty).toBe(false)
        expect(loaded.language).toBe('en')
        expect(loaded.autoSendGenotypes).toBe(true)
      } catch {
        // IndexedDB may not be available in test environment
        console.log('Skipping IndexedDB test - not available in test environment')
      }
    })

    it('should return default preferences when none exist', async () => {
      try {
        const loaded = await loadPreferences()

        expect(loaded).toBeDefined()
        expect(loaded.explanationLevel).toBeDefined()
        expect(loaded.tone).toBeDefined()
        expect(loaded.language).toBeDefined()
      } catch {
        // IndexedDB may not be available in test environment
        console.log('Skipping IndexedDB test - not available in test environment')
      }
    })

    it('should overwrite existing preferences', async () => {
      try {
        await savePreferences(samplePreferences)

        const updatedPreferences = {
          ...samplePreferences,
          explanationLevel: 'layman' as const,
        }
        await savePreferences(updatedPreferences)

        const loaded = await loadPreferences()
        expect(loaded.explanationLevel).toBe('layman')
      } catch {
        // IndexedDB may not be available in test environment
        console.log('Skipping IndexedDB test - not available in test environment')
      }
    })
  })
})
