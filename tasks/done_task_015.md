### Task 15: Set up the AppContext for global state management.

1. Create `src/context/AppContext.tsx`. This file will define a React Context that stores global data such as the SNP index, metadata, user preferences, memory, and functions for updating them:

   ```tsx
   import React, { createContext, useContext, useState } from 'react'
   import { MatchResult } from '../models/MatchResult'
   import { QueryPlan } from '../models/QueryPlan'

   interface Metadata {
     vendor: string
     fileName: string
     count: number
     hash: string
     uploadDate: string
   }

   interface Preferences {
     explanationLevel: 'layman' | 'normal' | 'technical'
     tone: 'calm' | 'formal'
     showUncertainty: boolean
     language: 'sv' | 'en'
     autoSendGenotypes: boolean
   }

   interface GlobalContextValue {
     snpIndex: Map<string, string> | null
     metadata: Metadata | null
     preferences: Preferences
     // Add additional memory structures as needed
     setSnpIndex: (index: Map<string, string>) => void
     setMetadata: (metadata: Metadata) => void
     setPreferences: (prefs: Preferences) => void
   }

   const defaultPreferences: Preferences = {
     explanationLevel: 'normal',
     tone: 'calm',
     showUncertainty: true,
     language: 'sv',
     autoSendGenotypes: false,
   }

   const GlobalContext = createContext<GlobalContextValue | undefined>(undefined)

   export const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
     const [snpIndex, setSnpIndex] = useState<Map<string, string> | null>(null)
     const [metadata, setMetadata] = useState<Metadata | null>(null)
     const [preferences, setPreferences] = useState<Preferences>(defaultPreferences)

     return (
       <GlobalContext.Provider
         value={{
           snpIndex,
           metadata,
           preferences,
           setSnpIndex,
           setMetadata,
           setPreferences,
         }}
       >
         {children}
       </GlobalContext.Provider>
     )
   }

   export const useGlobalContext = () => {
     const context = useContext(GlobalContext)
     if (!context) {
       throw new Error('useGlobalContext must be used within GlobalProvider')
     }
     return context
   }
   ```

2. Wrap your `<App />` component with the `<GlobalProvider>` in `src/main.tsx`:
   ```tsx
   import { GlobalProvider } from './context/AppContext'
   // ...
   ReactDOM.createRoot(...).render(
     <React.StrictMode>
       <GlobalProvider>
         <App />
       </GlobalProvider>
     </React.StrictMode>
   )
   ```
3. This context will provide a way to read and update global state from any component. You will expand it with additional memory and functions in later tasks.
