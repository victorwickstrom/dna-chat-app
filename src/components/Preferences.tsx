import { useState } from 'react'
import { useGlobalContext, type Preferences as PreferencesType } from '../context/AppContext'
import { savePreferences, resetMemory, exportMemory, importMemory } from '../storage'

const Preferences = () => {
  const { preferences, setPreferences, setTopicWeights, setKnowledgeGraph } = useGlobalContext()
  const [localPrefs, setLocalPrefs] = useState<PreferencesType>(preferences)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [resetStatus, setResetStatus] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState(false)

  const handleChange = <K extends keyof PreferencesType>(key: K, value: PreferencesType[K]) => {
    setLocalPrefs((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await savePreferences(localPrefs)
      setPreferences(localPrefs)
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full max-w-2xl rounded-lg border border-slate-300 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-800">Settings</h2>

      <div className="space-y-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="explanationLevel" className="text-sm font-medium text-slate-700">
            Explanation Level
          </label>
          <select
            id="explanationLevel"
            value={localPrefs.explanationLevel}
            onChange={(e) =>
              handleChange(
                'explanationLevel',
                e.target.value as PreferencesType['explanationLevel']
              )
            }
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="layman">Layman</option>
            <option value="normal">Normal</option>
            <option value="technical">Technical</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="tone" className="text-sm font-medium text-slate-700">
            Tone
          </label>
          <select
            id="tone"
            value={localPrefs.tone}
            onChange={(e) => handleChange('tone', e.target.value as PreferencesType['tone'])}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="calm">Calm</option>
            <option value="formal">Formal</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="showUncertainty"
            type="checkbox"
            checked={localPrefs.showUncertainty}
            onChange={(e) => handleChange('showUncertainty', e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="showUncertainty" className="text-sm text-slate-700">
            Show uncertainty in responses
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="autoSendGenotypes"
            type="checkbox"
            checked={localPrefs.autoSendGenotypes}
            onChange={(e) => handleChange('autoSendGenotypes', e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="autoSendGenotypes" className="text-sm text-slate-700">
            Send genotypes automatically without confirmation
          </label>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        {saved && <span className="text-sm text-green-600">Saved!</span>}
      </div>

      <div className="mt-8 border-t border-slate-200 pt-6">
        <h3 className="mb-2 text-base font-medium text-slate-800">Reset Memory</h3>
        <p className="mb-4 text-sm text-slate-600">
          This will delete all topic weights, knowledge graph, and conversation summaries. Your
          settings and DNA data will not be affected.
        </p>
        <button
          type="button"
          onClick={async () => {
            const confirmed = window.confirm(
              'Are you sure you want to delete all personal memory? This cannot be undone.'
            )
            if (confirmed) {
              await resetMemory()
              setTopicWeights({})
              setKnowledgeGraph({})
              setResetStatus('Memory has been reset!')
              setTimeout(() => setResetStatus(null), 3000)
            }
          }}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          Reset Memory
        </button>
        {resetStatus && <p className="mt-2 text-sm text-green-600">{resetStatus}</p>}
      </div>

      <div className="mt-8 border-t border-slate-200 pt-6">
        <h3 className="mb-2 text-base font-medium text-slate-800">Export / Import</h3>
        <p className="mb-4 text-sm text-slate-600">
          Save your memory to a file or restore from a previous export.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => exportMemory()}
            className="rounded-md bg-slate-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Export Memory
          </button>
          <label className="cursor-pointer rounded-md bg-slate-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
            Import Memory
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                setImportError(null)
                setImportSuccess(false)
                try {
                  await importMemory(file)
                  setImportSuccess(true)
                  setTimeout(() => setImportSuccess(false), 3000)
                  window.location.reload()
                } catch (err) {
                  setImportError(err instanceof Error ? err.message : 'Import failed.')
                }
                e.target.value = ''
              }}
            />
          </label>
        </div>
        {importError && <p className="mt-2 text-sm text-red-600">{importError}</p>}
        {importSuccess && <p className="mt-2 text-sm text-green-600">Import successful!</p>}
      </div>
    </div>
  )
}

export default Preferences
