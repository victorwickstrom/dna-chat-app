import { useState } from 'react'
import Chat from './components/Chat'
import DNAAnalyzer from './components/DNAAnalyzer'
import DNASummary from './components/DNASummary'
import FileUpload from './components/FileUpload'
import LanguageSwitcher from './components/LanguageSwitcher'
import Settings from './components/Settings'

type TabType = 'chat' | 'analysis'

const App = () => {
  const [showSettings, setShowSettings] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('chat')

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="flex items-center justify-between bg-blue-600 px-6 py-4 text-white shadow-sm">
        <span className="text-xl font-semibold">DNA Chat Assistant</span>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <button
            onClick={() => setShowSettings(true)}
            className="rounded-md bg-blue-500 px-3 py-1.5 text-sm font-medium hover:bg-blue-400"
          >
            ⚙️
          </button>
        </div>
      </header>

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8">
        <section>
          <FileUpload />
        </section>

        <DNASummary />

        <div className="flex gap-2 rounded-lg bg-white p-1 shadow-sm">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 rounded-md px-4 py-3 text-sm font-semibold transition ${
              activeTab === 'chat'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            💬 Chat med AI
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            className={`flex-1 rounded-md px-4 py-3 text-sm font-semibold transition ${
              activeTab === 'analysis'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            🧬 Riskanalys
          </button>
        </div>

        <section className="w-full">
          {activeTab === 'chat' ? <Chat /> : <DNAAnalyzer />}
        </section>
      </main>
    </div>
  )
}

export default App
