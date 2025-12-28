import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Preferences from './Preferences'
import MemoryOverview from './MemoryOverview'
import Privacy from './Privacy'

type Tab = 'preferences' | 'memory' | 'privacy'

interface SettingsProps {
  onClose: () => void
}

const Settings = ({ onClose }: SettingsProps) => {
  const [activeTab, setActiveTab] = useState<Tab>('preferences')
  const { i18n } = useTranslation()
  const lang = i18n.language

  const tabs: { id: Tab; label: string }[] = [
    { id: 'preferences', label: lang === 'en' ? 'Preferences' : 'Inställningar' },
    { id: 'memory', label: lang === 'en' ? 'Memory' : 'Minne' },
    { id: 'privacy', label: lang === 'en' ? 'Privacy' : 'Integritet' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-slate-50 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-800">
            {lang === 'en' ? 'Settings' : 'Inställningar'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            {lang === 'en' ? 'Close' : 'Stäng'}
          </button>
        </div>

        <div className="flex border-b border-slate-200 bg-white px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'preferences' && <Preferences />}
          {activeTab === 'memory' && <MemoryOverview />}
          {activeTab === 'privacy' && <Privacy />}
        </div>
      </div>
    </div>
  )
}

export default Settings
