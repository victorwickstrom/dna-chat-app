import { useState, useEffect } from 'react'
import Chat from './components/Chat'
import FileUpload from './components/FileUpload'
import FindingsPanel from './components/FindingsPanel'
import Settings from './components/Settings'
import DNASummary from './components/DNASummary'
import { useGlobalContext } from './context/AppContext'
import { clearData, loadSNPIndex } from './storage'
import { runDnaAnalysis } from './dna/DnaAnalysisController'

const App = () => {
  const [showSettings, setShowSettings] = useState(false)
  const [showFindings, setShowFindings] = useState(false)
  const [showRightPanel, setShowRightPanel] = useState(true)
  const { snpIndex, setSnpIndex, setMetadata } = useGlobalContext()
  const [hasDnaData, setHasDnaData] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load cached DNA data on app startup
  useEffect(() => {
    const loadCachedData = async () => {
      try {
        const { index, metadata } = await loadSNPIndex()
        if (index && index.size > 0 && metadata) {
          setSnpIndex(index)
          setMetadata(metadata)
          setHasDnaData(true)
          
          // Run analysis to generate findings and chat message
          const rsids = Array.from(index.keys())
          await runDnaAnalysis(rsids, index)
          // Show findings panel after analysis
          setShowFindings(true)
        }
      } catch (error) {
        console.error('Failed to load cached DNA data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadCachedData()
  }, [setSnpIndex, setMetadata])

  // Check if DNA data is available and show findings after upload
  useEffect(() => {
    const checkData = () => {
      setHasDnaData(snpIndex !== null && snpIndex.size > 0)
    }
    checkData()
  }, [snpIndex])
  
  // Listen for analysis complete to show findings modal
  useEffect(() => {
    const handleAnalysisComplete = () => {
      console.log('[App] DNA analysis complete - showing findings modal')
      // Set both states - hasDnaData true because analysis completed successfully
      setHasDnaData(true)
      setShowFindings(true)
    }
    
    window.addEventListener('dna-analysis-complete', handleAnalysisComplete)
    return () => window.removeEventListener('dna-analysis-complete', handleAnalysisComplete)
  }, [])

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
        <div className="text-center">
          <div className="mb-4 text-6xl">🧬</div>
          <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Upload view - shown when no DNA data
  if (!hasDnaData) {
    return (
      <div className="inset-0 overflow-y-auto bg-gradient-to-br from-slate-50 to-indigo-50 min-h-screen">
        {showSettings && <Settings onClose={() => setShowSettings(false)} />}
        
        <div className="mx-auto max-w-4xl p-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mb-4 text-6xl">🧬</div>
            <h1 className="text-3xl font-bold text-slate-800">DNA helper</h1>
            <p className="mt-2 text-slate-600">
              Upload your DNA file to explore your genetic data with AI
            </p>
          </div>

          {/* File upload */}
          <div className="mx-auto max-w-xl">
            <FileUpload />
          </div>

          {/* DNA Download Guide */}
          <div className="mt-12">
            <h2 className="mb-2 text-center text-xl font-bold text-slate-800">
              📥 How to Get Your DNA File
            </h2>
            <p className="mb-6 text-center text-sm text-slate-600">
              Download your raw DNA data from your testing provider
            </p>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* 23andMe */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-800">
                  <span className="text-purple-600">🧬</span> 23andMe
                </h3>
                <ol className="space-y-1 text-xs text-slate-600">
                  <li>1. Log in at 23andme.com</li>
                  <li>2. Go to Settings → Privacy</li>
                  <li>3. Scroll to "23andMe Data"</li>
                  <li>4. Click "Download Raw Data"</li>
                </ol>
                <a href="https://you.23andme.com/tools/data/download/" target="_blank" rel="noopener noreferrer"
                  className="mt-3 inline-block text-xs font-medium text-indigo-600 hover:underline">
                  Go to 23andMe →
                </a>
              </div>

              {/* AncestryDNA */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-800">
                  <span className="text-green-600">🌳</span> AncestryDNA
                </h3>
                <ol className="space-y-1 text-xs text-slate-600">
                  <li>1. Log in at ancestry.com</li>
                  <li>2. Go to DNA → Settings</li>
                  <li>3. Click "Download Raw DNA Data"</li>
                  <li>4. Check email for download link</li>
                </ol>
                <a href="https://www.ancestry.com/dna/settings" target="_blank" rel="noopener noreferrer"
                  className="mt-3 inline-block text-xs font-medium text-indigo-600 hover:underline">
                  Go to AncestryDNA →
                </a>
              </div>

              {/* MyHeritage */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-800">
                  <span className="text-blue-600">👨‍👩‍👧</span> MyHeritage
                </h3>
                <ol className="space-y-1 text-xs text-slate-600">
                  <li>1. Log in at myheritage.com</li>
                  <li>2. Go to DNA → Manage DNA kits</li>
                  <li>3. Click the ⋮ menu on your kit</li>
                  <li>4. Select "Download raw DNA data"</li>
                </ol>
                <a href="https://www.myheritage.com/dna/manage" target="_blank" rel="noopener noreferrer"
                  className="mt-3 inline-block text-xs font-medium text-indigo-600 hover:underline">
                  Go to MyHeritage →
                </a>
              </div>

              {/* FamilyTreeDNA */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-800">
                  <span className="text-orange-600">🌲</span> FamilyTreeDNA
                </h3>
                <ol className="space-y-1 text-xs text-slate-600">
                  <li>1. Log in at familytreedna.com</li>
                  <li>2. Go to your Profile page</li>
                  <li>3. Click "Download Raw Data"</li>
                  <li>4. Save the file</li>
                </ol>
                <a href="https://www.familytreedna.com/my/profile" target="_blank" rel="noopener noreferrer"
                  className="mt-3 inline-block text-xs font-medium text-indigo-600 hover:underline">
                  Go to FamilyTreeDNA →
                </a>
              </div>

              {/* LivingDNA */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-800">
                  <span className="text-teal-600">🔬</span> LivingDNA
                </h3>
                <ol className="space-y-1 text-xs text-slate-600">
                  <li>1. Log in at livingdna.com</li>
                  <li>2. Go to your Dashboard</li>
                  <li>3. Find Settings or Profile</li>
                  <li>4. Click "Download" button</li>
                </ol>
                <a href="https://my.livingdna.com/" target="_blank" rel="noopener noreferrer"
                  className="mt-3 inline-block text-xs font-medium text-indigo-600 hover:underline">
                  Go to LivingDNA →
                </a>
              </div>

              {/* Other */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-800">
                  <span className="text-slate-600">📁</span> Other Providers
                </h3>
                <ol className="space-y-1 text-xs text-slate-600">
                  <li>1. Log in to your DNA service</li>
                  <li>2. Look for Settings or Profile</li>
                  <li>3. Search for "Raw Data" or "Download"</li>
                  <li>4. Download as TXT, ZIP or GZ</li>
                </ol>
                <p className="mt-3 text-xs text-slate-500">
                  Most services offer raw data download
                </p>
              </div>
            </div>
          </div>

          {/* Settings button */}
          <div className="mt-8 text-center">
            <button
              onClick={() => setShowSettings(true)}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              ⚙️ Settings
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Main app view - embedded in website, no fixed positioning
  return (
    <div id="app-root">
      {/* Main App Container - embedded view */}
      <div id="main-app" className="rounded-lg bg-white">
        {/* Compact DNA summary with action buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <DNASummary compact />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFindings(true)}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              💬 Open Chat & Findings
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              ⚙️
            </button>
            <button
              onClick={async () => {
                const confirmed = window.confirm('This will remove all DNA data from your browser. Continue?')
                if (confirmed) {
                  await clearData()
                  window.location.reload()
                }
              }}
              className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}

      {/* ============================================== */}
      {/* FINDINGS MODAL - 2 COLUMNS: CHAT + FINDINGS   */}
      {/* Position: fixed, z-index: 9999, full screen   */}
      {/* ============================================== */}
      {showFindings && (
        <div 
          id="findings-modal"
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column'
          }}
          className="bg-white"
        >
          {/* Modal Header */}
          <div 
            style={{ flexShrink: 0, boxShadow: '0 0 15px rgba(0, 0, 0, 0.17)' }}
            className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3"
          >
            <div className="flex items-center gap-3">
              <img src="/assets/img/logo.png" alt="DNA helper" className="h-10" />
            </div>
            <button
              onClick={() => setShowFindings(false)}
              className="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 font-medium text-slate-700 hover:bg-slate-200"
            >
              ✕ Close
            </button>
          </div>

          {/* 2-Column Layout: Chat (left) + Findings (right) */}
          <div className="flex flex-1 overflow-hidden relative">
            {/* Left Column - Chat */}
            <div 
              className="flex-1 flex flex-col border-r border-slate-200"
              onClick={() => showRightPanel && setShowRightPanel(false)}
            >
              <Chat />
            </div>

            {/* Toggle Button for Right Panel - Always visible */}
            <button
              onClick={() => setShowRightPanel(!showRightPanel)}
              className="absolute top-1/2 -translate-y-1/2 z-20 bg-indigo-600 text-white border-none rounded-l-lg py-3 px-2 cursor-pointer shadow-lg hover:bg-indigo-700 transition-all duration-300"
              style={{
                right: showRightPanel ? 'min(400px, 85vw)' : '0',
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
              }}
            >
              <span className="text-xs font-semibold">
                {showRightPanel ? '◀ Hide' : '▶ Findings'}
              </span>
            </button>

            {/* Right Column - Findings (Collapsible) */}
            <div 
              className="flex flex-col bg-slate-50 transition-all duration-300 ease-in-out overflow-hidden absolute md:relative right-0 top-0 bottom-0 z-10"
              style={{ 
                width: showRightPanel ? 'min(400px, 85vw)' : '0',
                opacity: showRightPanel ? 1 : 0,
              }}
            >
              <FindingsPanel onClose={() => setShowFindings(false)} onFindingClick={() => setShowRightPanel(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
