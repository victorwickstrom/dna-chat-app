import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import {
  getTopicWeights,
  getKnowledgeGraph,
  getConversationSummaries,
  deleteTopicWeight,
  setTopicWeight,
  deleteKnowledgeGraphEntry,
  setKnowledgeGraphEntry,
  deleteConversationSummary,
} from '../storage'

interface EditModalProps {
  title: string
  currentValue: number
  onSave: (value: number) => void
  onDelete: () => void
  onClose: () => void
}

const EditModal = ({ title, currentValue, onSave, onDelete, onClose }: EditModalProps) => {
  const [value, setValue] = useState(currentValue)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-80 rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold text-slate-800">{title}</h3>
        <label className="mb-2 block text-sm text-slate-600">Vikt</label>
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="mb-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          step="0.5"
          min="0"
        />
        <div className="flex gap-2">
          <button
            onClick={() => onSave(value)}
            className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Spara
          </button>
          <button
            onClick={onDelete}
            className="flex-1 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Ta bort
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Avbryt
          </button>
        </div>
      </div>
    </div>
  )
}

interface ConversationSummary {
  id: string
  timestamp: string
  topics: string[]
  keyPoints: string[]
}

const MemoryOverview = () => {
  const [topicWeights, setTopicWeightsState] = useState<Record<string, number>>({})
  const [knowledgeGraph, setKnowledgeGraphState] = useState<Record<string, number>>({})
  const [summaries, setSummaries] = useState<ConversationSummary[]>([])
  const [editingTopic, setEditingTopic] = useState<string | null>(null)
  const [editingEntity, setEditingEntity] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshData = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true)
    }

    const [topics, graph, convSummaries] = await Promise.all([
      getTopicWeights(),
      getKnowledgeGraph(),
      getConversationSummaries(),
    ])

    setTopicWeightsState(topics)
    setKnowledgeGraphState(graph)
    setSummaries(convSummaries)

    if (showLoading) {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    const loadData = async () => {
      const [topics, graph, convSummaries] = await Promise.all([
        getTopicWeights(),
        getKnowledgeGraph(),
        getConversationSummaries(),
      ])

      if (!active) return

      setTopicWeightsState(topics)
      setKnowledgeGraphState(graph)
      setSummaries(convSummaries)
      setLoading(false)
    }

    void loadData()
    return () => {
      active = false
    }
  }, [])

  const handleSaveTopic = async (topic: string, weight: number) => {
    await setTopicWeight(topic, weight)
    setEditingTopic(null)
    await refreshData()
  }

  const handleDeleteTopic = async (topic: string) => {
    await deleteTopicWeight(topic)
    setEditingTopic(null)
    await refreshData()
  }

  const handleSaveEntity = async (entity: string, weight: number) => {
    await setKnowledgeGraphEntry(entity, weight)
    setEditingEntity(null)
    await refreshData()
  }

  const handleDeleteEntity = async (entity: string) => {
    await deleteKnowledgeGraphEntry(entity)
    setEditingEntity(null)
    await refreshData()
  }

  const handleDeleteSummary = async (id: string) => {
    if (window.confirm('Ta bort denna konversationssammanfattning?')) {
      await deleteConversationSummary(id)
      await refreshData()
    }
  }

  const topicData = Object.entries(topicWeights)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }))

  const entityData = Object.entries(knowledgeGraph)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([name, value]) => ({
      name: name.replace(/^(gene|snp|topic):/, ''),
      value,
      fullName: name,
    }))

  if (loading) {
    return <div className="p-6 text-slate-500">Laddar minnesdata...</div>
  }

  return (
    <div className="w-full max-w-4xl space-y-6 rounded-lg border border-slate-300 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800">Systemets minne</h2>

      <section>
        <h3 className="mb-3 text-base font-medium text-slate-700">Ämnesvikter</h3>
        {topicData.length === 0 ? (
          <p className="text-sm text-slate-500">Inga ämnen registrerade ännu.</p>
        ) : (
          <>
            <div className="mb-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topicData} layout="vertical" margin={{ left: 80 }}>
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-1">
              {topicData.map(({ name, value }) => (
                <li key={name} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">{value}</span>
                    <button
                      onClick={() => setEditingTopic(name)}
                      className="text-blue-600 hover:underline"
                    >
                      Redigera
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-base font-medium text-slate-700">Kunskapsgraf</h3>
        {entityData.length === 0 ? (
          <p className="text-sm text-slate-500">Inga entiteter registrerade ännu.</p>
        ) : (
          <>
            <div className="mb-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={entityData} layout="vertical" margin={{ left: 100 }}>
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-1">
              {entityData.map(({ value, fullName }) => (
                <li key={fullName} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{fullName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">{value}</span>
                    <button
                      onClick={() => setEditingEntity(fullName)}
                      className="text-blue-600 hover:underline"
                    >
                      Redigera
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-base font-medium text-slate-700">Konversationssammanfattningar</h3>
        {summaries.length === 0 ? (
          <p className="text-sm text-slate-500">Inga sammanfattningar sparade ännu.</p>
        ) : (
          <ul className="space-y-3">
            {summaries.map((summary) => (
              <li key={summary.id} className="rounded-md border border-slate-200 p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-slate-400">{summary.timestamp}</p>
                    <p className="text-sm text-slate-700">
                      <strong>Ämnen:</strong> {summary.topics.join(', ')}
                    </p>
                    <p className="text-sm text-slate-600">
                      {summary.keyPoints.slice(0, 2).join('; ')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteSummary(summary.id)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Ta bort
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editingTopic && (
        <EditModal
          title={`Redigera ämne: ${editingTopic}`}
          currentValue={topicWeights[editingTopic] ?? 0}
          onSave={(value) => handleSaveTopic(editingTopic, value)}
          onDelete={() => handleDeleteTopic(editingTopic)}
          onClose={() => setEditingTopic(null)}
        />
      )}

      {editingEntity && (
        <EditModal
          title={`Redigera: ${editingEntity}`}
          currentValue={knowledgeGraph[editingEntity] ?? 0}
          onSave={(value) => handleSaveEntity(editingEntity, value)}
          onDelete={() => handleDeleteEntity(editingEntity)}
          onClose={() => setEditingEntity(null)}
        />
      )}
    </div>
  )
}

export default MemoryOverview
