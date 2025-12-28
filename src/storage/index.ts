import { openDB, type IDBPDatabase } from 'idb'
import type { Preferences } from '../context/AppContext'

export interface StoredMetadata {
  vendor: string
  fileName: string
  count: number
  hash: string
  uploadDate: string
}

interface TopicWeights {
  [topic: string]: number
}

interface KnowledgeGraph {
  [entity: string]: number
}

interface ConversationSummary {
  id: string
  timestamp: string
  topics: string[]
  keyPoints: string[]
}

type DBSchema = {
  snpIndex: string | null
  metadata: StoredMetadata
  preferences: Preferences
  topicWeights: TopicWeights
  knowledgeGraph: KnowledgeGraph
  conversationSummaries: ConversationSummary
}

let dbPromise: Promise<IDBPDatabase<DBSchema>> | null = null

const getDb = () => {
  if (!dbPromise) {
    dbPromise = openDB<DBSchema>('dnaDb', 3, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('snpIndex')) {
          db.createObjectStore('snpIndex')
        }
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata')
        }
        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences')
        }
        if (!db.objectStoreNames.contains('topicWeights')) {
          db.createObjectStore('topicWeights')
        }
        if (!db.objectStoreNames.contains('knowledgeGraph')) {
          db.createObjectStore('knowledgeGraph')
        }
        if (!db.objectStoreNames.contains('conversationSummaries')) {
          db.createObjectStore('conversationSummaries', { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}

export const saveSNPIndex = async (
  index: Map<string, string | null>,
  metadata: StoredMetadata,
): Promise<void> => {
  const db = await getDb()
  const tx = db.transaction(['snpIndex', 'metadata'], 'readwrite')
  const snpStore = tx.objectStore('snpIndex')
  const metaStore = tx.objectStore('metadata')

  await snpStore.clear()
  for (const [rsid, genotype] of index.entries()) {
    await snpStore.put(genotype ?? null, rsid)
  }

  await metaStore.put(metadata, 'current')
  await tx.done
  console.log('Saved SNP index with', index.size, 'entries (metadata vendor:', metadata.vendor, ')')
}

export const loadSNPIndex = async (): Promise<{
  index: Map<string, string | null>
  metadata: StoredMetadata | null
}> => {
  const db = await getDb()
  const tx = db.transaction(['snpIndex', 'metadata'], 'readonly')
  const snpStore = tx.objectStore('snpIndex')
  const metaStore = tx.objectStore('metadata')

  const metadata = (await metaStore.get('current')) ?? null
  if (!metadata) {
    await tx.done
    return { index: new Map(), metadata: null }
  }

  const index = new Map<string, string | null>()
  let cursor = await snpStore.openCursor()
  while (cursor) {
    index.set(cursor.key as string, (cursor.value as string | null) ?? null)
    cursor = await cursor.continue()
  }

  await tx.done
  return { index, metadata }
}

export const clearData = async (): Promise<void> => {
  const db = await getDb()
  const tx = db.transaction(['snpIndex', 'metadata'], 'readwrite')
  await Promise.all([tx.objectStore('snpIndex').clear(), tx.objectStore('metadata').clear()])
  await tx.done
}

export const getMetadata = async (): Promise<StoredMetadata | null> => {
  const db = await getDb()
  return (
    (await db.transaction('metadata', 'readonly').objectStore('metadata').get('current')) ?? null
  )
}

const defaultPreferences: Preferences = {
  explanationLevel: 'normal',
  tone: 'calm',
  showUncertainty: true,
  language: 'sv',
  autoSendGenotypes: false,
}

export const savePreferences = async (prefs: Preferences): Promise<void> => {
  const db = await getDb()
  await db.transaction('preferences', 'readwrite').objectStore('preferences').put(prefs, 'current')
}

export const loadPreferences = async (): Promise<Preferences> => {
  const db = await getDb()
  const stored = await db
    .transaction('preferences', 'readonly')
    .objectStore('preferences')
    .get('current')
  return stored ?? defaultPreferences
}

export const incrementTopicWeight = async (topic: string): Promise<void> => {
  const db = await getDb()
  const store = db.transaction('topicWeights', 'readwrite').objectStore('topicWeights')
  const current = (await store.get(topic)) ?? 0
  await store.put(current + 1, topic)
}

export const getTopicWeights = async (): Promise<TopicWeights> => {
  const db = await getDb()
  const weights: TopicWeights = {}
  let cursor = await db
    .transaction('topicWeights', 'readonly')
    .objectStore('topicWeights')
    .openCursor()
  while (cursor) {
    weights[cursor.key as string] = cursor.value as number
    cursor = await cursor.continue()
  }
  return weights
}

export const incrementKnowledgeGraph = async (entity: string): Promise<void> => {
  const db = await getDb()
  const store = db.transaction('knowledgeGraph', 'readwrite').objectStore('knowledgeGraph')
  const current = (await store.get(entity)) ?? 0
  await store.put(current + 1, entity)
}

export const getKnowledgeGraph = async (): Promise<KnowledgeGraph> => {
  const db = await getDb()
  const graph: KnowledgeGraph = {}
  let cursor = await db
    .transaction('knowledgeGraph', 'readonly')
    .objectStore('knowledgeGraph')
    .openCursor()
  while (cursor) {
    graph[cursor.key as string] = cursor.value as number
    cursor = await cursor.continue()
  }
  return graph
}

export const saveConversationSummary = async (summary: ConversationSummary): Promise<void> => {
  const db = await getDb()
  await db
    .transaction('conversationSummaries', 'readwrite')
    .objectStore('conversationSummaries')
    .put(summary)
}

export const getConversationSummaries = async (): Promise<ConversationSummary[]> => {
  const db = await getDb()
  return await db
    .transaction('conversationSummaries', 'readonly')
    .objectStore('conversationSummaries')
    .getAll()
}

export const deleteTopicWeight = async (topic: string): Promise<void> => {
  const db = await getDb()
  await db.transaction('topicWeights', 'readwrite').objectStore('topicWeights').delete(topic)
}

export const setTopicWeight = async (topic: string, weight: number): Promise<void> => {
  const db = await getDb()
  await db.transaction('topicWeights', 'readwrite').objectStore('topicWeights').put(weight, topic)
}

export const deleteKnowledgeGraphEntry = async (entity: string): Promise<void> => {
  const db = await getDb()
  await db.transaction('knowledgeGraph', 'readwrite').objectStore('knowledgeGraph').delete(entity)
}

export const setKnowledgeGraphEntry = async (entity: string, weight: number): Promise<void> => {
  const db = await getDb()
  await db
    .transaction('knowledgeGraph', 'readwrite')
    .objectStore('knowledgeGraph')
    .put(weight, entity)
}

export const deleteConversationSummary = async (id: string): Promise<void> => {
  const db = await getDb()
  await db
    .transaction('conversationSummaries', 'readwrite')
    .objectStore('conversationSummaries')
    .delete(id)
}

export const resetMemory = async (includePreferences = false): Promise<void> => {
  const db = await getDb()
  const storeNames: (
    | 'topicWeights'
    | 'knowledgeGraph'
    | 'conversationSummaries'
    | 'preferences'
  )[] = ['topicWeights', 'knowledgeGraph', 'conversationSummaries']
  if (includePreferences) {
    storeNames.push('preferences')
  }
  const tx = db.transaction(storeNames, 'readwrite')
  await Promise.all(storeNames.map((store) => tx.objectStore(store).clear()))
  await tx.done
}

interface MemoryExport {
  preferences: Preferences
  topicWeights: Record<string, number>
  knowledgeGraph: Record<string, number>
  conversationSummaries: ConversationSummary[]
  exportDate: string
}

export const exportMemory = async (): Promise<void> => {
  const [preferences, topicWeights, knowledgeGraph, conversationSummaries] = await Promise.all([
    loadPreferences(),
    getTopicWeights(),
    getKnowledgeGraph(),
    getConversationSummaries(),
  ])

  const data: MemoryExport = {
    preferences,
    topicWeights,
    knowledgeGraph,
    conversationSummaries,
    exportDate: new Date().toISOString(),
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `dna-chat-memory-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export const importMemory = async (file: File): Promise<void> => {
  const text = await file.text()
  let data: MemoryExport

  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Filen innehåller ogiltig JSON.')
  }

  if (
    !data.preferences ||
    !data.topicWeights ||
    !data.knowledgeGraph ||
    !data.conversationSummaries
  ) {
    throw new Error('Filen saknar nödvändiga fält.')
  }

  const db = await getDb()

  await savePreferences(data.preferences)

  const twTx = db.transaction('topicWeights', 'readwrite')
  const twStore = twTx.objectStore('topicWeights')
  await twStore.clear()
  for (const [topic, weight] of Object.entries(data.topicWeights)) {
    await twStore.put(weight, topic)
  }
  await twTx.done

  const kgTx = db.transaction('knowledgeGraph', 'readwrite')
  const kgStore = kgTx.objectStore('knowledgeGraph')
  await kgStore.clear()
  for (const [entity, weight] of Object.entries(data.knowledgeGraph)) {
    await kgStore.put(weight, entity)
  }
  await kgTx.done

  const csTx = db.transaction('conversationSummaries', 'readwrite')
  const csStore = csTx.objectStore('conversationSummaries')
  await csStore.clear()
  for (const summary of data.conversationSummaries) {
    await csStore.put(summary)
  }
  await csTx.done
}
