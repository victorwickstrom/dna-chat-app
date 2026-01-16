import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import './i18n'
import App from './App'
import AutomaticAnalysis from './components/AutomaticAnalysis'
import { GlobalProvider } from './context/AppContext'
import ErrorBoundary from './components/ErrorBoundary'

// Mount main app
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <GlobalProvider>
        <App />
      </GlobalProvider>
    </ErrorBoundary>
  </StrictMode>
)

// Mount Automatic Analysis section (if element exists)
const autoAnalysisRoot = document.getElementById('auto-analysis-root')
if (autoAnalysisRoot) {
  createRoot(autoAnalysisRoot).render(
    <StrictMode>
      <ErrorBoundary>
        <GlobalProvider>
          <AutomaticAnalysis />
        </GlobalProvider>
      </ErrorBoundary>
    </StrictMode>
  )
}
