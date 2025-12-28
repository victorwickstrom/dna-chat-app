import { useState } from 'react'
import { useGlobalContext } from '../context/AppContext'
import geneticModelsData from '../data/geneticModels.json'

interface SNPDefinition {
  rsid: string
  riskAllele: string
  weight: number
}

interface GeneticModel {
  id: string
  name?: string
  category: string
  snps: SNPDefinition[]
  thresholds?: { low: number; medium: number }
  population?: string
  interpretation: {
    low: string
    medium: string
    high: string
  }
  evidence?: Array<{ source: string; pubmed: string }>
  severity?: string
  confidence?: string
}

interface SNPDetail {
  rsid: string
  riskAllele: string
  weight: number
  yourGenotype: string
  riskAlleleCount: number
  contribution: string
}

interface AnalysisResult {
  modelId: string
  name: string
  category: string
  categoryLabel: string
  riskLevel: 'low' | 'medium' | 'high'
  score: string
  explanation: string
  snpDetails: SNPDetail[]
  matchedSnps: number
  totalSnps: number
}

const categoryLabels: Record<string, string> = {
  eye: '👁️ Ögon',
  autoimmune: '🛡️ Autoimmun',
  metabolism: '⚡ Metabolism',
  nutrition: '🥗 Näring',
  metabolic: '🩺 Metabol',
  cardiovascular: '❤️ Hjärta',
  neurological: '🧠 Neurologisk',
  skin: '🧴 Hud',
  pharmacogenomic: '💊 Läkemedel',
  cancer: '🎗️ Cancer',
  mental_health: '🧘 Mental hälsa',
  trait: '🧬 Egenskap',
  psychiatric: '🧠 Psykiatrisk',
  sensory: '👂 Sensorisk',
}

// Load all 100 genetic models from JSON file
const models: GeneticModel[] = geneticModelsData as GeneticModel[]

function countRiskAlleles(genotype: string | null | undefined, riskAllele: string): number {
  if (!genotype) return 0
  let count = 0
  for (const allele of genotype) {
    if (allele.toUpperCase() === riskAllele.toUpperCase()) {
      count++
    }
  }
  return count
}

function formatModelId(id: string): string {
  return id
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function analyzeDNA(snpIndex: Map<string, string | null> | null): AnalysisResult[] {
  if (!snpIndex || snpIndex.size === 0) return []

  const results: AnalysisResult[] = []

  for (const model of models) {
    let totalScore = 0
    const snpDetails: SNPDetail[] = []
    let matchedSnps = 0

    for (const snp of model.snps) {
      const rsidLower = snp.rsid.toLowerCase()
      const genotype = snpIndex.get(rsidLower)
      const riskCount = countRiskAlleles(genotype, snp.riskAllele)
      const snpScore = riskCount * snp.weight
      totalScore += snpScore

      if (genotype) {
        matchedSnps++
      }

      snpDetails.push({
        rsid: snp.rsid,
        riskAllele: snp.riskAllele,
        weight: snp.weight,
        yourGenotype: genotype || 'Ej hittad',
        riskAlleleCount: riskCount,
        contribution: snpScore.toFixed(2),
      })
    }

    const thresholds = model.thresholds || { low: 1.5, medium: 3.0 }
    let riskLevel: 'low' | 'medium' | 'high' = 'low'
    if (totalScore >= thresholds.medium) {
      riskLevel = 'high'
    } else if (totalScore >= thresholds.low) {
      riskLevel = 'medium'
    }

    results.push({
      modelId: model.id,
      name: model.name || formatModelId(model.id),
      category: model.category,
      categoryLabel: categoryLabels[model.category] || model.category,
      riskLevel,
      score: totalScore.toFixed(2),
      explanation: model.interpretation[riskLevel],
      snpDetails,
      matchedSnps,
      totalSnps: model.snps.length,
    })
  }

  const riskOrder = { high: 0, medium: 1, low: 2 }
  results.sort((a, b) => {
    if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
      return riskOrder[a.riskLevel] - riskOrder[b.riskLevel]
    }
    return parseFloat(b.score) - parseFloat(a.score)
  })

  return results
}

const ResultCard = ({ result }: { result: AnalysisResult }) => {
  const [expanded, setExpanded] = useState(false)

  const riskColors = {
    low: 'bg-gradient-to-r from-green-500 to-emerald-400',
    medium: 'bg-gradient-to-r from-orange-500 to-amber-400',
    high: 'bg-gradient-to-r from-red-600 to-rose-500',
  }

  const riskLabels = {
    low: '🟢 Låg risk',
    medium: '🟠 Medel risk',
    high: '🔴 Hög risk',
  }

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl">
      <div className={`relative p-5 text-white ${riskColors[result.riskLevel]}`}>
        <div className="text-xs font-medium uppercase tracking-wider opacity-90">
          {result.categoryLabel}
        </div>
        <div className="mt-1 text-lg font-bold">{result.name}</div>
        <div className="mt-2 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
          {riskLabels[result.riskLevel]}
        </div>
        <div className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-lg font-bold">
          {result.score}
        </div>
      </div>

      <div className="p-5">
        <p className="text-sm leading-relaxed text-slate-600">{result.explanation}</p>

        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-100 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
        >
          <span>{expanded ? 'Dölj SNP-detaljer' : 'Visa SNP-detaljer'}</span>
          <span className={`transition-transform ${expanded ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {expanded && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-3 py-2 font-semibold">RSID</th>
                  <th className="px-3 py-2 font-semibold">Din genotyp</th>
                  <th className="px-3 py-2 font-semibold">Riskallel</th>
                  <th className="px-3 py-2 font-semibold">Match</th>
                  <th className="px-3 py-2 font-semibold">Bidrag</th>
                </tr>
              </thead>
              <tbody>
                {result.snpDetails.map((snp) => (
                  <tr key={snp.rsid} className="border-b border-slate-100">
                    <td className="px-3 py-2 font-mono text-slate-700">{snp.rsid}</td>
                    <td className="px-3 py-2">{snp.yourGenotype}</td>
                    <td className="px-3 py-2">{snp.riskAllele}</td>
                    <td className="px-3 py-2">
                      {snp.riskAlleleCount > 0 ? (
                        <span className="font-semibold text-red-600">Ja ({snp.riskAlleleCount}x)</span>
                      ) : (
                        <span className="text-green-600">Nej</span>
                      )}
                    </td>
                    <td className="px-3 py-2">{snp.contribution}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

const DNAAnalyzer = () => {
  const { snpIndex } = useGlobalContext()
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')

  // Compute results directly from snpIndex (no need for useEffect)
  const results = snpIndex && snpIndex.size > 0 ? analyzeDNA(snpIndex) : []

  const filteredResults = filter === 'all' ? results : results.filter((r) => r.riskLevel === filter)

  const stats = {
    total: results.length,
    high: results.filter((r) => r.riskLevel === 'high').length,
    medium: results.filter((r) => r.riskLevel === 'medium').length,
    low: results.filter((r) => r.riskLevel === 'low').length,
  }

  if (!snpIndex || snpIndex.size === 0) {
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow-sm">
        <div className="text-4xl">🧬</div>
        <h3 className="mt-4 text-lg font-semibold text-slate-800">Ingen DNA-data laddad</h3>
        <p className="mt-2 text-sm text-slate-500">
          Ladda upp din DNA-fil ovan för att köra riskanalyser
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-4 shadow-sm">
        <div className="flex gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
            <div className="text-xs text-slate-500">Modeller</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.high}</div>
            <div className="text-xs text-slate-500">Hög risk</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-500">{stats.medium}</div>
            <div className="text-xs text-slate-500">Medel</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.low}</div>
            <div className="text-xs text-slate-500">Låg</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['all', 'high', 'medium', 'low'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f === 'all' && 'Alla'}
              {f === 'high' && '🔴 Hög'}
              {f === 'medium' && '🟠 Medel'}
              {f === 'low' && '🟢 Låg'}
            </button>
          ))}
        </div>
      </div>

      {filteredResults.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <p className="text-slate-500">Inga resultat matchar filtret</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2">
          {filteredResults.map((result) => (
            <ResultCard key={result.modelId} result={result} />
          ))}
        </div>
      )}
    </div>
  )
}

export default DNAAnalyzer
