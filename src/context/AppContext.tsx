/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

export interface Metadata {
  vendor: string
  fileName: string
  count: number
  hash: string
  uploadDate: string
}

export interface Preferences {
  explanationLevel: 'layman' | 'normal' | 'technical'
  tone: 'calm' | 'formal'
  showUncertainty: boolean
  language: 'en'
  autoSendGenotypes: boolean
}

interface GlobalContextValue {
  snpIndex: Map<string, string | null> | null
  metadata: Metadata | null
  preferences: Preferences
  topicWeights: Record<string, number>
  knowledgeGraph: Record<string, number>
  pendingQuestion: string | null
  setSnpIndex: (index: Map<string, string | null> | null) => void
  setMetadata: (metadata: Metadata) => void
  setPreferences: (prefs: Preferences) => void
  setTopicWeights: (weights: Record<string, number>) => void
  setKnowledgeGraph: (graph: Record<string, number>) => void
  setPendingQuestion: (question: string | null) => void
}

const defaultPreferences: Preferences = {
  explanationLevel: 'normal',
  tone: 'calm',
  showUncertainty: true,
  language: 'en',
  autoSendGenotypes: false,
}

const GlobalContext = createContext<GlobalContextValue | undefined>(undefined)

export const GlobalProvider = ({ children }: { children: ReactNode }) => {
  const [snpIndexState, setSnpIndexState] = useState<Map<string, string | null> | null>(null)
  const [metadata, setMetadata] = useState<Metadata | null>(null)
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences)
  const [topicWeights, setTopicWeights] = useState<Record<string, number>>({})
  const [knowledgeGraph, setKnowledgeGraph] = useState<Record<string, number>>({})
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null)

  const setSnpIndex = useCallback((index: Map<string, string | null> | null) => {
    setSnpIndexState(index)
  }, [])

  const value = useMemo(
    () => ({
      snpIndex: snpIndexState,
      metadata,
      preferences,
      topicWeights,
      knowledgeGraph,
      pendingQuestion,
      setSnpIndex,
      setMetadata,
      setPreferences,
      setTopicWeights,
      setKnowledgeGraph,
      setPendingQuestion,
    }),
    [snpIndexState, metadata, preferences, topicWeights, knowledgeGraph, pendingQuestion, setSnpIndex]
  )

  return <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>
}

export const useGlobalContext = () => {
  const context = useContext(GlobalContext)
  if (!context) {
    throw new Error('useGlobalContext must be used within a GlobalProvider')
  }
  return context
}
