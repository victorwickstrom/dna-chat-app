/**
 * FindingsPanel - Displays genetic findings in a scrollable panel
 * Shows detailed AI-generated explanations for each variant
 * Clicking on a finding sends a question to the chat
 */

import { useState, useEffect } from 'react'
import { useGlobalContext } from '../context/AppContext'
import { dnaState, type DnaAnalysisStatus } from '../dna/dnaState'
import type { SnpMatchResult } from '../dna-analysis/SnpMatcher'
import type { SnpChatExplanation } from '../dna-analysis/SnpEnrichmentApi'
import { getAutoAnalyzeTopics } from '../learning'

interface LearnedTopic {
  id: string
  display_name: string
  snps: string[]
  category: string
}

interface TraitResult {
  topic: LearnedTopic
  matchedSnps: string[]
  interpretation: { result: string; detail: string; icon: string } | null
  genotypes: Map<string, string>
}

const categoryIcons: Record<string, string> = {
  trait: '🎨',
  cancer_risk: '🔬',
  disease_risk: '⚕️',
  metabolism: '⚡',
  other: '🧬',
}

function interpretGenotype(topicId: string, snpData: Map<string, string>): { result: string; detail: string; icon: string } | null {
  switch (topicId) {
    case 'eye_color': {
      const rs12913832 = snpData.get('rs12913832')?.toUpperCase()
      if (rs12913832?.includes('G') && rs12913832?.includes('G')) {
        return { result: 'Likely Blue/Green Eyes', detail: 'GG genotype strongly associated with blue or green eye color', icon: '👁️' }
      } else if (rs12913832?.includes('A') && rs12913832?.includes('A')) {
        return { result: 'Likely Brown Eyes', detail: 'AA genotype strongly associated with brown eye color', icon: '👁️' }
      }
      return null
    }
    case 'caffeine': {
      const rs762551 = snpData.get('rs762551')?.toUpperCase()
      if (rs762551?.includes('A') && rs762551?.includes('A')) {
        return { result: 'Fast Caffeine Metabolizer', detail: 'You process caffeine quickly', icon: '☕' }
      } else if (rs762551?.includes('C')) {
        return { result: 'Slow Caffeine Metabolizer', detail: 'Caffeine stays in your system longer', icon: '😴' }
      }
      return null
    }
    case 'lactose': {
      const rs4988235 = snpData.get('rs4988235')?.toUpperCase()
      if (rs4988235?.includes('T')) {
        return { result: 'Lactose Tolerant', detail: 'You likely produce lactase and can digest dairy', icon: '🥛' }
      } else {
        return { result: 'Likely Lactose Intolerant', detail: 'You may have reduced ability to digest lactose', icon: '🚫' }
      }
    }
    case 'earwax': {
      const rs17822931 = snpData.get('rs17822931')?.toUpperCase()
      // TT = dry earwax, CC or CT = wet earwax
      // Must check for exact TT (both alleles T)
      const normalized = rs17822931?.replace(/[;\/]/g, '') // Remove separators
      if (normalized === 'TT') {
        return { result: 'Dry Earwax Type', detail: 'TT genotype - dry, flaky earwax', icon: '👂' }
      } else if (normalized?.includes('C')) {
        return { result: 'Wet Earwax Type', detail: 'CC or CT genotype - wet, sticky earwax', icon: '👂' }
      }
      return null
    }
    case 'alcohol': {
      const rs671 = snpData.get('rs671')?.toUpperCase()
      if (rs671?.includes('A')) {
        return { result: 'Alcohol Flush Response', detail: 'You may experience facial flushing when drinking', icon: '🍷' }
      } else {
        return { result: 'Normal Alcohol Metabolism', detail: 'Standard ALDH2 enzyme activity', icon: '✓' }
      }
    }
    case 'brca': {
      // Check for pathogenic variants
      const rs80357906 = snpData.get('rs80357906')?.toUpperCase()
      const rs80358981 = snpData.get('rs80358981')?.toUpperCase()
      const rs1799950 = snpData.get('rs1799950')?.toUpperCase()
      const rs1799966 = snpData.get('rs1799966')?.toUpperCase()
      
      // Check for any risk alleles
      if (rs80357906?.includes('A') || rs80358981?.includes('T')) {
        return { result: 'Pathogenic Variant Detected', detail: 'Consult genetic counselor', icon: '⚠️' }
      } else if (rs1799950?.includes('A') || rs1799966?.includes('T')) {
        return { result: 'Common Variants Present', detail: 'Low-risk polymorphisms detected', icon: 'ℹ️' }
      } else {
        return { result: 'No Risk Variants', detail: 'Normal BRCA genotype', icon: '✅' }
      }
    }
    default:
      return null
  }
}

interface FindingsPanelProps {
  onClose?: () => void
}

export default function FindingsPanel({ onClose }: FindingsPanelProps) {
  const { setPendingQuestion, snpIndex } = useGlobalContext()
  const [status, setStatus] = useState<DnaAnalysisStatus>(dnaState.status)
  const [snpResult, setSnpResult] = useState<SnpMatchResult | null>(dnaState.snpMatchResult)
  const [snpDetails, setSnpDetails] = useState<SnpChatExplanation[]>(dnaState.snpDetails)
  const [learnedTopics, setLearnedTopics] = useState<LearnedTopic[]>([])
  const [traitResults, setTraitResults] = useState<TraitResult[]>([])

  // Load learned topics (and refresh when new topics are learned)
  useEffect(() => {
    async function loadTopics() {
      const topics = await getAutoAnalyzeTopics()
      setLearnedTopics(topics)
    }
    loadTopics()
    
    // Listen for when new topics are learned from chat
    const handleTopicsUpdated = () => {
      console.log('[FindingsPanel] Topics updated, reloading...')
      loadTopics()
    }
    window.addEventListener('topics-updated', handleTopicsUpdated)
    return () => window.removeEventListener('topics-updated', handleTopicsUpdated)
  }, [])

  // Sync DNA state
  useEffect(() => {
    const syncState = () => {
      setStatus(dnaState.status)
      setSnpResult(dnaState.snpMatchResult)
      setSnpDetails(dnaState.snpDetails || [])
    }
    syncState()
    window.addEventListener('dna-analysis-complete', syncState)
    window.addEventListener('dna-analysis-error', syncState)
    return () => {
      window.removeEventListener('dna-analysis-complete', syncState)
      window.removeEventListener('dna-analysis-error', syncState)
    }
  }, [])

  // Build trait results when data is available
  // Use BOTH snpResult.matches AND snpIndex for full coverage
  useEffect(() => {
    if (!learnedTopics.length) return
    if (!snpResult && !snpIndex) return

    // Build a map of ALL user's SNPs (from snpIndex if available, else from matches)
    const userSnpData = new Map<string, string>()
    
    // First add from snpIndex (contains ALL user SNPs)
    if (snpIndex) {
      snpIndex.forEach((genotype, rsid) => {
        if (genotype) userSnpData.set(rsid.toLowerCase(), genotype)
      })
    }
    
    // Also add from matches (may have more info)
    if (snpResult) {
      for (const match of snpResult.matches) {
        userSnpData.set(match.rsid.toLowerCase(), match.userGenotype)
      }
    }
    
    console.log(`[FindingsPanel] Building traits from ${userSnpData.size} total SNPs`)

    const results: TraitResult[] = []
    for (const topic of learnedTopics) {
      const matchedSnps = topic.snps.filter(snp => userSnpData.has(snp.toLowerCase()))
      if (matchedSnps.length > 0) {
        const genotypes = new Map<string, string>()
        matchedSnps.forEach(snp => {
          const gt = userSnpData.get(snp.toLowerCase())
          if (gt) genotypes.set(snp.toUpperCase(), gt)
        })
        results.push({
          topic,
          matchedSnps,
          interpretation: interpretGenotype(topic.id, userSnpData),
          genotypes,
        })
        console.log(`[FindingsPanel] Topic ${topic.id}: matched ${matchedSnps.length}/${topic.snps.length} SNPs`)
      }
    }
    setTraitResults(results)
  }, [snpResult, snpIndex, learnedTopics])

  const hasData = snpResult && snpResult.matchedCount > 0

  const handleDetailClick = (detail: SnpChatExplanation) => {
    const question = `Tell me more about ${detail.rsid} in the ${detail.gene || 'gene'}. My genotype is ${detail.genotype}. What should I know about this variant?`
    setPendingQuestion(question)
  }

  if (status === 'analyzing') {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        <p className="mt-4 text-sm font-medium text-slate-700">Analyzing...</p>
      </div>
    )
  }

  if (!hasData) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="text-4xl">🔬</div>
        <h3 className="mt-3 text-lg font-semibold text-slate-800">No findings yet</h3>
        <p className="mt-1 text-sm text-slate-500">Upload your DNA file to see findings</p>
      </div>
    )
  }

  // Group snpDetails by riskLevel (if available)
  const highAttention = snpDetails.filter(d => d.riskLevel === 'high' || d.riskLevel === 'very_high')
  const elevatedRisk = snpDetails.filter(d => d.riskLevel === 'elevated' || d.riskLevel === 'moderate_high')
  const moderateRisk = snpDetails.filter(d => d.riskLevel === 'moderate' || d.riskLevel === 'low' || !d.riskLevel)

  // Fallback: Use snpResult categories when snpDetails is empty
  const hasAiDetails = snpDetails.length > 0
  const highRiskSnps = snpResult?.byCategory.bad.filter(s => s.weight >= 3) || []
  const elevatedRiskSnps = snpResult?.byCategory.bad.filter(s => s.weight >= 1 && s.weight < 3) || []
  const moderateRiskSnps = snpResult?.byCategory.bad.filter(s => s.weight < 1) || []
  const goodSnps = snpResult?.byCategory.good || []

  const totalVariants = snpResult?.matchedCount || 0
  const riskVariants = snpResult?.byCategory.bad.length || 0

  const handleSnpClick = (snp: { rsid: string; gene?: string | null; genotype: string }) => {
    const question = `Tell me about ${snp.rsid}${snp.gene ? ` in ${snp.gene}` : ''}. My genotype is ${snp.genotype}. What does this mean for my health?`
    setPendingQuestion(question)
  }

  const handleTraitClick = (trait: TraitResult) => {
    const question = `Tell me about my ${trait.topic.display_name} genetics. ${trait.interpretation ? `My result shows: ${trait.interpretation.result}` : ''}`
    setPendingQuestion(question)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header summary */}
      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-indigo-50 px-4 py-3">
        <h3 className="font-bold text-slate-800">🧬 Your Genetic Analysis</h3>
        <p className="text-xs text-slate-600 mt-1">
          Analyzed {totalVariants} variants • Found {riskVariants} relevant for health
        </p>
      </div>

      {/* Scrollable findings list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* === 0. TRAIT ANALYSIS (Eye Color, Caffeine, etc.) === */}
        {traitResults.length > 0 && (
          <div>
            <h3 className="mb-3 font-bold text-slate-800 border-b pb-2">🎨 Trait Analysis</h3>
            <div className="grid grid-cols-2 gap-2">
              {traitResults.map((trait) => (
                <button
                  key={trait.topic.id}
                  onClick={() => handleTraitClick(trait)}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-left transition hover:shadow-md hover:ring-2 hover:ring-emerald-300"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{categoryIcons[trait.topic.category] || '🧬'}</span>
                    <span className="font-semibold text-slate-800 text-sm">{trait.topic.display_name}</span>
                  </div>
                  {trait.interpretation && (
                    <div className="flex items-center gap-1 rounded bg-white/60 px-2 py-1 mt-1">
                      <span>{trait.interpretation.icon}</span>
                      <span className="text-xs font-medium text-emerald-800">{trait.interpretation.result}</span>
                    </div>
                  )}
                  <div className="mt-1 flex flex-wrap gap-1">
                    {Array.from(trait.genotypes.entries()).slice(0, 2).map(([rsid, gt]) => (
                      <span key={rsid} className="rounded bg-slate-200 px-1 py-0.5 text-xs text-slate-600">
                        {rsid}: <strong>{gt}</strong>
                      </span>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-emerald-700">Click to ask →</p>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* === 1. AI DETAILED RESULTS (from prompt) === */}
        {hasAiDetails && (
          <div className="space-y-3">
            <h3 className="font-bold text-slate-800 border-b pb-2">📋 Detailed Risk Analysis</h3>
            {snpDetails.map((detail, idx) => (
              <DetailCard key={`${detail.rsid}-${idx}`} detail={detail} onClick={() => handleDetailClick(detail)} />
            ))}
          </div>
        )}

        {/* === 2. GENERAL RISK SUMMARY === */}
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
          <h3 className="font-bold text-indigo-800 mb-2">📊 Risk Summary</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-red-600">⚠️</span>
              <span className="text-slate-700">High: <strong>{highRiskSnps.length}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-orange-500">🔶</span>
              <span className="text-slate-700">Elevated: <strong>{elevatedRiskSnps.length}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">ℹ️</span>
              <span className="text-slate-700">Moderate: <strong>{moderateRiskSnps.length}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-500">✅</span>
              <span className="text-slate-700">Beneficial: <strong>{goodSnps.length}</strong></span>
            </div>
          </div>
        </div>

        {/* === 3. SNP FINDINGS === */}
        {snpResult && (
          <>
            {/* High Risk */}
            {highRiskSnps.length > 0 && (
              <div>
                <h3 className="mb-3 flex items-center gap-2 font-bold text-red-700">
                  <span>⚠️</span> High Attention ({highRiskSnps.length})
                </h3>
                <div className="space-y-2">
                  {highRiskSnps.map((snp) => (
                    <SimpleCard key={snp.key} snp={snp} severity="high" onClick={() => handleSnpClick(snp)} />
                  ))}
                </div>
              </div>
            )}

            {/* Elevated Risk */}
            {elevatedRiskSnps.length > 0 && (
              <div>
                <h3 className="mb-3 flex items-center gap-2 font-bold text-orange-700">
                  <span>🔶</span> Elevated Risk ({elevatedRiskSnps.length})
                </h3>
                <div className="space-y-2">
                  {elevatedRiskSnps.map((snp) => (
                    <SimpleCard key={snp.key} snp={snp} severity="elevated" onClick={() => handleSnpClick(snp)} />
                  ))}
                </div>
              </div>
            )}

            {/* Moderate */}
            {moderateRiskSnps.length > 0 && (
              <div>
                <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-600">
                  <span>ℹ️</span> Moderate Relevance ({moderateRiskSnps.length})
                </h3>
                <div className="space-y-2">
                  {moderateRiskSnps.slice(0, 15).map((snp) => (
                    <SimpleCard key={snp.key} snp={snp} severity="moderate" onClick={() => handleSnpClick(snp)} />
                  ))}
                  {moderateRiskSnps.length > 15 && (
                    <p className="text-xs text-slate-500 text-center">+{moderateRiskSnps.length - 15} more</p>
                  )}
                </div>
              </div>
            )}

            {/* Good variants */}
            {goodSnps.length > 0 && (
              <div>
                <h3 className="mb-3 flex items-center gap-2 font-bold text-emerald-700">
                  <span>✅</span> Beneficial Variants ({goodSnps.length})
                </h3>
                <div className="space-y-2">
                  {goodSnps.slice(0, 10).map((snp) => (
                    <SimpleCard key={snp.key} snp={snp} severity="good" onClick={() => handleSnpClick(snp)} />
                  ))}
                  {goodSnps.length > 10 && (
                    <p className="text-xs text-slate-500 text-center">+{goodSnps.length - 10} more</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Important disclaimer */}
        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h4 className="font-semibold text-slate-700 flex items-center gap-2">
            <span>⚕️</span> Important to Remember
          </h4>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
            Genetics is only one part of your health picture. Environment, lifestyle, diet, and other factors often play a bigger role.
          </p>
        </div>
      </div>
    </div>
  )
}

function DetailCard({ 
  detail, 
  onClick 
}: { 
  detail: SnpChatExplanation
  onClick: () => void
}) {
  // Determine severity from riskLevel
  const severity = detail.riskLevel === 'high' || detail.riskLevel === 'very_high' 
    ? 'high' 
    : detail.riskLevel === 'elevated' || detail.riskLevel === 'moderate_high'
    ? 'elevated'
    : 'moderate'
  const colors = {
    high: 'border-red-200 bg-red-50 hover:ring-red-300',
    elevated: 'border-orange-200 bg-orange-50 hover:ring-orange-300',
    moderate: 'border-slate-200 bg-white hover:ring-slate-300',
  }

  const titleColors = {
    high: 'text-red-800',
    elevated: 'text-orange-800',
    moderate: 'text-slate-700',
  }

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border p-4 text-left transition hover:shadow-md hover:ring-2 ${colors[severity]}`}
    >
      {/* Header: Gene + rsid + genotype */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className={`font-bold ${titleColors[severity]}`}>
            {detail.gene || 'Unknown'} ({detail.rsid})
          </span>
        </div>
        <span className="rounded bg-white/70 px-2 py-0.5 text-xs font-mono font-medium text-slate-600 shrink-0">
          {detail.genotype}
        </span>
      </div>

      {/* Title if available */}
      {detail.title && (
        <p className="mt-1 text-sm font-medium text-slate-700">{detail.title}</p>
      )}

      {/* Explanation */}
      {detail.explanation && (
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          {detail.explanation}
        </p>
      )}

      {/* Recommendation */}
      {detail.recommendation && (
        <div className="mt-3 flex items-start gap-2 rounded bg-white/60 p-2">
          <span className="text-amber-500">💡</span>
          <p className="text-xs text-slate-700">{detail.recommendation}</p>
        </div>
      )}

      <p className="mt-2 text-xs text-indigo-600 font-medium">Click to ask more →</p>
    </button>
  )
}

// Simple card for fallback view (when no AI details)
function SimpleCard({ 
  snp, 
  severity, 
  onClick 
}: { 
  snp: { rsid: string; gene?: string | null; genotype: string; description?: string | null }
  severity: 'high' | 'elevated' | 'moderate' | 'good'
  onClick: () => void
}) {
  const colors = {
    high: 'border-red-200 bg-red-50 hover:ring-red-300',
    elevated: 'border-orange-200 bg-orange-50 hover:ring-orange-300',
    moderate: 'border-slate-200 bg-white hover:ring-slate-300',
    good: 'border-emerald-200 bg-emerald-50 hover:ring-emerald-300',
  }

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border p-3 text-left transition hover:shadow-md hover:ring-2 ${colors[severity]}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono font-semibold text-slate-800">{snp.rsid}</span>
          {snp.gene && <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-xs text-indigo-700">{snp.gene}</span>}
        </div>
        <span className="rounded bg-white/70 px-2 py-0.5 text-xs font-medium text-slate-600">{snp.genotype}</span>
      </div>
      {snp.description && (
        <p className="mt-1 text-xs text-slate-600 line-clamp-2">{snp.description}</p>
      )}
      <p className="mt-1 text-xs text-indigo-600">Click to ask →</p>
    </button>
  )
}
