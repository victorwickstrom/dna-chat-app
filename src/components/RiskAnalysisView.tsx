/**
 * RiskAnalysisView - Main component for displaying genetic risk analysis
 * 
 * Displays matched SNPs with AI-enriched explanations in a tabbed interface:
 * - Om din risk (About your risk)
 * - Andra riskfaktorer (Other risk factors)
 * - Om sjukdomen (About the disease/trait)
 * - Rapportdetaljer (Report details)
 */

import { useState, useEffect, useMemo } from 'react'
import { dnaState, type DnaAnalysisStatus } from '../dna/dnaState'
import type { SnpMatchResult, SnpMatch } from '../dna-analysis/SnpMatcher'
import type { EnrichedSnp } from '../dna-analysis/SnpEnrichmentApi'

type TabId = 'risk' | 'factors' | 'about' | 'details'

const tabs: { id: TabId; label: string }[] = [
  { id: 'risk', label: 'About Your Risk' },
  { id: 'factors', label: 'Other Risk Factors' },
  { id: 'about', label: 'About the Gene' },
  { id: 'details', label: 'Report Details' },
]

const riskLevelColors: Record<string, { bg: string; text: string; bar: string }> = {
  low: { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500' },
  moderate: { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' },
  elevated: { bg: 'bg-orange-50', text: 'text-orange-700', bar: 'bg-orange-500' },
  high: { bg: 'bg-red-50', text: 'text-red-700', bar: 'bg-red-500' },
}

const categoryColors: Record<string, string> = {
  Good: 'bg-emerald-100 text-emerald-800',
  Bad: 'bg-red-100 text-red-800',
  neutral: 'bg-slate-100 text-slate-700',
}

export default function RiskAnalysisView() {
  const [status, setStatus] = useState<DnaAnalysisStatus>(dnaState.status)
  const [snpResult, setSnpResult] = useState<SnpMatchResult | null>(dnaState.snpMatchResult)
  const [enrichedSnps, setEnrichedSnps] = useState<EnrichedSnp[]>(dnaState.enrichedSnps)
  const [error, setError] = useState<string | undefined>(dnaState.error)
  const [activeTab, setActiveTab] = useState<TabId>('risk')
  const [selectedSnp, setSelectedSnp] = useState<EnrichedSnp | SnpMatch | null>(null)

  useEffect(() => {
    const syncState = () => {
      setStatus(dnaState.status)
      setSnpResult(dnaState.snpMatchResult)
      setEnrichedSnps(dnaState.enrichedSnps)
      setError(dnaState.error)
    }

    window.addEventListener('dna-analysis-complete', syncState)
    window.addEventListener('dna-analysis-error', syncState)
    return () => {
      window.removeEventListener('dna-analysis-complete', syncState)
      window.removeEventListener('dna-analysis-error', syncState)
    }
  }, [])

  
  const hasData = snpResult && snpResult.matchedCount > 0

  // Group enriched SNPs by gene for display
  const snpsByGene = useMemo(() => {
    if (!enrichedSnps.length && !snpResult) return new Map<string, (EnrichedSnp | SnpMatch)[]>()
    
    const map = new Map<string, (EnrichedSnp | SnpMatch)[]>()
    const snpsToGroup = enrichedSnps.length > 0 ? enrichedSnps : snpResult?.significantFindings ?? []
    
    for (const snp of snpsToGroup) {
      const gene = snp.gene || 'Unknown gene'
      const existing = map.get(gene) || []
      existing.push(snp)
      map.set(gene, existing)
    }
    
    return map
  }, [enrichedSnps, snpResult])

  if (status === 'analyzing') {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        <p className="mt-4 text-lg font-medium text-slate-700">Analyzing your DNA data...</p>
        <p className="text-sm text-slate-500">Matching against genetic knowledge base</p>
      </div>
    )
  }

  if (!hasData) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
        <div className="text-5xl">🧬</div>
        <h3 className="mt-4 text-xl font-bold text-slate-800">Waiting for DNA data</h3>
        <p className="mt-2 text-slate-500">
          Upload your DNA file to view your genetic risk analysis
        </p>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <SummaryHeader snpResult={snpResult!} enrichedSnps={enrichedSnps} />


      {/* Main Content with Selected SNP Details */}
      {selectedSnp ? (
        <SnpDetailView 
          snp={selectedSnp} 
          onBack={() => setSelectedSnp(null)}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      ) : (
        <>
          {/* Gene Groups */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Genetic Findings by Gene</h2>
            {Array.from(snpsByGene.entries()).map(([gene, snps]) => (
              <GeneGroup 
                key={gene} 
                gene={gene} 
                snps={snps} 
                onSelectSnp={setSelectedSnp}
              />
            ))}
          </div>

          {/* All Findings List */}
          {snpResult && snpResult.byCategory.bad.length > 0 && (
            <RiskFindingsSection 
              title="Risk-Associated Variants" 
              snps={snpResult.byCategory.bad}
              onSelectSnp={setSelectedSnp}
            />
          )}
        </>
      )}
    </div>
  )
}

// =============================================================================
// Summary Header
// =============================================================================

function SummaryHeader({ 
  snpResult, 
  enrichedSnps 
}: { 
  snpResult: SnpMatchResult
  enrichedSnps: EnrichedSnp[]
}) {
  const badCount = snpResult.byCategory.bad.length
  const goodCount = snpResult.byCategory.good.length
  const geneCount = snpResult.byGene.size
  const aiEnriched = enrichedSnps.filter(s => s.aiExplanation && !s.aiError).length

  return (
    <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 p-6 text-white shadow-xl">
      <h1 className="text-2xl font-bold">Your Genetic Analysis</h1>
      <p className="mt-2 text-indigo-100">
        We found <span className="font-bold text-white">{snpResult.matchedCount}</span> genetic variants in your DNA
      </p>
      
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBox label="Matched SNPs" value={snpResult.matchedCount} />
        <StatBox label="Genes Involved" value={geneCount} />
        <StatBox label="Risk-Associated" value={badCount} variant="warning" />
        <StatBox label="AI-Analyzed" value={aiEnriched} variant="info" />
      </div>

      {badCount > 0 && (
        <div className="mt-4 rounded-lg bg-white/10 p-3">
          <p className="text-sm">
            <span className="font-semibold text-amber-200">{badCount} variants</span> are associated with elevated risk. 
            Click on a gene or variant to read AI-generated explanations.
          </p>
        </div>
      )}
    </div>
  )
}

function StatBox({ 
  label, 
  value, 
  variant = 'default' 
}: { 
  label: string
  value: number
  variant?: 'default' | 'warning' | 'info'
}) {
  const bgClass = variant === 'warning' 
    ? 'bg-amber-500/20' 
    : variant === 'info' 
    ? 'bg-sky-500/20' 
    : 'bg-white/10'
  
  return (
    <div className={`rounded-lg ${bgClass} p-3`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-indigo-100">{label}</p>
    </div>
  )
}

// =============================================================================
// Gene Group Card
// =============================================================================

function GeneGroup({ 
  gene, 
  snps, 
  onSelectSnp 
}: { 
  gene: string
  snps: (EnrichedSnp | SnpMatch)[]
  onSelectSnp: (snp: EnrichedSnp | SnpMatch) => void
}) {
  const badCount = snps.filter(s => s.category === 'Bad').length
  const hasAiExplanation = snps.some(s => 'aiExplanation' in s && s.aiExplanation)
  
  // Get the most significant description from the SNPs
  const primaryDescription = snps
    .filter(s => s.description)
    .sort((a, b) => (b.weight || 0) - (a.weight || 0))[0]?.description
  
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-indigo-100 px-3 py-1 text-sm font-bold text-indigo-700">
            {gene}
          </span>
          <span className="text-sm text-slate-500">{snps.length} variants</span>
          {badCount > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
              {badCount} risk
            </span>
          )}
          {hasAiExplanation && (
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-700">
              AI
            </span>
          )}
        </div>
      </div>

      {/* Description preview */}
      {primaryDescription && (
        <p className="mt-2 text-sm text-slate-600 line-clamp-2">
          {primaryDescription}
        </p>
      )}
      
      <div className="mt-3 flex flex-wrap gap-2">
        {snps.slice(0, 5).map((snp) => (
          <button
            key={snp.key}
            onClick={() => onSelectSnp(snp)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition hover:ring-2 hover:ring-indigo-300 ${
              categoryColors[snp.category || 'neutral']
            }`}
          >
            {snp.rsid}
            {snp.weight > 0 && (
              <span className="ml-1 text-xs opacity-70">({snp.weight})</span>
            )}
          </button>
        ))}
        {snps.length > 5 && (
          <span className="px-2 py-1.5 text-sm text-slate-400">
            +{snps.length - 5} more
          </span>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Risk Findings Section
// =============================================================================

function RiskFindingsSection({ 
  title, 
  snps, 
  onSelectSnp 
}: { 
  title: string
  snps: SnpMatch[]
  onSelectSnp: (snp: SnpMatch) => void
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
      <h3 className="flex items-center gap-2 font-bold text-red-800">
        <span className="text-lg">⚠️</span>
        {title}
      </h3>
      <div className="mt-3 space-y-2">
        {snps.slice(0, 10).map((snp) => (
          <button
            key={snp.key}
            onClick={() => onSelectSnp(snp)}
            className="flex w-full items-center justify-between rounded-lg bg-white p-3 text-left shadow-sm transition hover:shadow-md"
          >
            <div>
              <span className="font-semibold text-slate-900">{snp.rsid}</span>
              {snp.gene && (
                <span className="ml-2 text-sm text-slate-500">({snp.gene})</span>
              )}
              <p className="mt-1 text-sm text-slate-600">{snp.description || 'No description'}</p>
            </div>
            <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
              Weight: {snp.weight}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// SNP Detail View with Tabs
// =============================================================================

function SnpDetailView({ 
  snp, 
  onBack,
  activeTab,
  setActiveTab
}: { 
  snp: EnrichedSnp | SnpMatch
  onBack: () => void
  activeTab: TabId
  setActiveTab: (tab: TabId) => void
}) {
  const enriched = snp as EnrichedSnp
  const riskLevel = enriched.aiRiskLevel || (snp.category === 'Bad' ? 'elevated' : 'low')
  const colors = riskLevelColors[riskLevel] || riskLevelColors.low

  return (
    <div className="space-y-4">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
      >
        ← Back to overview
      </button>

      {/* SNP Header */}
      <div className={`rounded-2xl ${colors.bg} p-6`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-900">{snp.rsid}</h2>
              {snp.gene && (
                <span className="rounded-lg bg-indigo-600 px-3 py-1 text-sm font-semibold text-white">
                  {snp.gene}
                </span>
              )}
            </div>
            <p className="mt-1 text-slate-600">Genotype: <span className="font-mono font-semibold">{snp.genotype}</span></p>
          </div>
          <div className={`rounded-xl ${colors.bg} border-2 border-current px-4 py-2 ${colors.text}`}>
            <p className="text-xs uppercase tracking-wider">Risk Level</p>
            <p className="text-lg font-bold capitalize">{riskLevel}</p>
          </div>
        </div>

        {/* Risk Bar Visualization */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Low</span>
            <span>Moderate</span>
            <span>Elevated</span>
            <span>High</span>
          </div>
          <div className="mt-1 flex h-3 overflow-hidden rounded-full bg-slate-200">
            <div className={`${colors.bar} transition-all`} style={{ 
              width: riskLevel === 'low' ? '25%' : riskLevel === 'moderate' ? '50%' : riskLevel === 'elevated' ? '75%' : '100%' 
            }} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        {activeTab === 'risk' && <TabRisk snp={snp} enriched={enriched} />}
        {activeTab === 'factors' && <TabFactors snp={snp} />}
        {activeTab === 'about' && <TabAbout snp={snp} enriched={enriched} />}
        {activeTab === 'details' && <TabDetails snp={snp} />}
      </div>
    </div>
  )
}

// =============================================================================
// Tab Content Components
// =============================================================================

function TabRisk({ snp, enriched }: { snp: SnpMatch; enriched: EnrichedSnp }) {
  // Extract risk multiplier from description if available (e.g., "5.49x risk of...")
  const riskMatch = snp.description?.match(/(\d+\.?\d*)x/i)
  const riskMultiplier = riskMatch ? parseFloat(riskMatch[1]) : null
  
  // Calculate approximate population percentages based on risk multiplier
  // Assuming baseline risk of 1% for most conditions
  const baselineRisk = 1
  const yourRisk = riskMultiplier ? Math.min(baselineRisk * riskMultiplier, 50) : null
  const noRisk = yourRisk ? 100 - yourRisk : null
  

  return (
    <div className="space-y-6">
      {/* Introduction */}
      <section className="rounded-lg bg-slate-50 p-4">
        <p className="text-sm text-slate-600 leading-relaxed">
          The information on this page helps you understand your results better, 
          how your results compare to the general population, and what 
          other factors may affect your risk.
        </p>
      </section>

      {/* Variant detected */}
      <section>
        <h3 className="text-lg font-bold text-slate-900">Risk Variant Detected</h3>
        <p className="mt-2 text-slate-700">
          We have analyzed the variant <span className="font-mono font-semibold">{snp.rsid}</span>
          {snp.gene && <> in the gene <span className="font-semibold">{snp.gene}</span></>}.
          {snp.description && (
            <span className="block mt-2 text-slate-600">
              <span className="font-medium">Description:</span> {snp.description}
            </span>
          )}
        </p>
      </section>

      {/* AI Explanation */}
      {enriched.aiExplanation && (
        <section>
          <h3 className="text-lg font-bold text-slate-900">Your Genetic Risk Estimate</h3>
          <p className="mt-2 text-slate-700 leading-relaxed">{enriched.aiExplanation}</p>
        </section>
      )}

      {/* Population comparison - only show if we have risk data */}
      {yourRisk && noRisk && (
        <section className="rounded-xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-900">Among people with the same variant as you:</h3>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-amber-50 p-4 text-center">
              <p className="text-3xl font-bold text-amber-700">{yourRisk.toFixed(0)}%</p>
              <p className="mt-1 text-sm text-amber-600">May develop related condition</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-4 text-center">
              <p className="text-3xl font-bold text-emerald-700">{noRisk.toFixed(0)}%</p>
              <p className="mt-1 text-sm text-emerald-600">Will not develop the condition</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            * Estimate based on reported risk multiplier and general population data.
          </p>
        </section>
      )}


      {/* Health implications */}
      {enriched.aiHealthImplications && enriched.aiHealthImplications.length > 0 && (
        <section>
          <h3 className="text-lg font-bold text-slate-900">Health Implications</h3>
          <ul className="mt-2 space-y-2">
            {enriched.aiHealthImplications.map((imp, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-indigo-500" />
                <span className="text-slate-700">{imp}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Overview summary */}
      <section className="rounded-xl bg-indigo-50 p-5">
        <h3 className="font-bold text-indigo-900">Get an Overview</h3>
        <p className="mt-2 text-sm text-indigo-800 leading-relaxed">
          Your genetic risk estimate shows that you have a 
          {snp.category === 'Bad' ? ' elevated ' : ' normal '}
          risk based on this variant. 
          Other factors, such as your environment and lifestyle, can also affect your risk.
        </p>
        <p className="mt-2 text-sm text-indigo-700">
          It is important to consider all these factors when managing your health.
        </p>
      </section>

      {/* Recommendations */}
      {enriched.aiRecommendations && enriched.aiRecommendations.length > 0 && (
        <section className="rounded-lg bg-emerald-50 p-4">
          <h3 className="font-bold text-emerald-800">💡 Recommendations</h3>
          <ul className="mt-2 space-y-1">
            {enriched.aiRecommendations.map((rec, i) => (
              <li key={i} className="text-sm text-emerald-700">• {rec}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function TabFactors({ snp }: { snp: SnpMatch }) {
  return (
    <div className="space-y-6">
      {/* Introduction */}
      <section className="rounded-lg bg-slate-50 p-4">
        <p className="text-sm text-slate-600 leading-relaxed">
          In addition to genetics, there are many other factors that affect your overall risk. 
          Understanding these can help you make informed decisions about your health.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-bold text-slate-900">Other Factors Affecting Risk</h3>
        <p className="mt-2 text-slate-600">
          Even if you have a genetic variant, it does not mean you will develop the condition. 
          These factors can affect your overall risk:
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <FactorCard 
          title="Lifestyle" 
          icon="🏃"
          items={[
            'Diet and nutrition - what you eat affects gene expression',
            'Physical activity - regular exercise reduces many risks',
            'Sleep and recovery - important for cell repair',
            'Stress management - chronic stress affects the immune system'
          ]}
        />
        <FactorCard 
          title="Environment" 
          icon="🌍"
          items={[
            'Exposure to environmental toxins and chemicals',
            'Air quality where you live and work',
            'Exposure to UV radiation',
            'Work-related risk factors'
          ]}
        />
        <FactorCard 
          title="Medical History" 
          icon="🏥"
          items={[
            'Previous illnesses and conditions',
            'Family health history (beyond genetics)',
            'Current medications',
            'Previous treatments'
          ]}
        />
        <FactorCard 
          title="Age and Sex" 
          icon="👤"
          items={[
            'Risk for many conditions increases with age',
            'Some conditions are more common in one sex',
            'Hormonal changes throughout life',
            'Reproductive history'
          ]}
        />
      </div>

      {/* Summary */}
      <section className="rounded-xl bg-amber-50 p-5">
        <h3 className="font-bold text-amber-900">⚡ What You Can Do</h3>
        <p className="mt-2 text-sm text-amber-800">
          While you cannot change your genes, you can influence many of the other factors. 
          Talk to your doctor about which lifestyle changes may be most relevant for you 
          based on your genetic results.
        </p>
      </section>
    </div>
  )
}

function FactorCard({ title, icon, items }: { title: string; icon: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <h4 className="flex items-center gap-2 font-semibold text-slate-900">
        <span>{icon}</span>
        {title}
      </h4>
      <ul className="mt-2 space-y-1 text-sm text-slate-600">
        {items.map((item, i) => (
          <li key={i}>• {item}</li>
        ))}
      </ul>
    </div>
  )
}

function TabAbout({ snp, enriched }: { snp: SnpMatch; enriched: EnrichedSnp }) {
  // Extract condition from description
  const conditionMatch = snp.description?.match(/risk (?:of|for) ([^;,]+)/i)
  const condition = conditionMatch ? conditionMatch[1].trim() : null
  
  return (
    <div className="space-y-6">
      {/* About the condition/disease */}
      {condition && (
        <section>
          <h3 className="text-lg font-bold text-slate-900">About {condition}</h3>
          <p className="mt-2 text-slate-600 leading-relaxed">
            This genetic variant is associated with {condition.toLowerCase()}. 
            It is important to understand that genetic risk is not the same as diagnosis - 
            many people with risk variants never develop related conditions.
          </p>
        </section>
      )}

      {/* About the gene */}
      {snp.gene ? (
        <>
          <section className="rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-2xl">🧬</span>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{snp.gene}</h3>
                <p className="text-sm text-slate-500">Associated Gene</p>
              </div>
            </div>
            
            {enriched.aiExplanation ? (
              <p className="mt-4 text-slate-700 leading-relaxed">
                {enriched.aiExplanation}
              </p>
            ) : (
              <p className="mt-4 text-slate-600">
                The gene <span className="font-semibold">{snp.gene}</span> is associated with this genetic variant. 
                This gene plays a role in the body's biological processes and variations in it can affect 
                how the body functions.
              </p>
            )}
          </section>

          {/* Variant details */}
          <section>
            <h3 className="text-lg font-bold text-slate-900">About the Variant {snp.rsid}</h3>
            <div className="mt-3 space-y-3">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm">
                  <span className="font-medium">Your genotype:</span>{' '}
                  <span className="font-mono font-semibold">{snp.genotype}</span>
                </p>
                {snp.description && (
                  <p className="mt-2 text-sm text-slate-600">
                    <span className="font-medium">Association:</span> {snp.description}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Research links */}
          <section className="rounded-lg bg-indigo-50 p-4">
            <h4 className="font-semibold text-indigo-900">📚 Learn More</h4>
            <p className="mt-2 text-sm text-indigo-700">
              For more scientific information about <span className="font-semibold">{snp.gene}</span> and {snp.rsid}:
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a 
                href={`https://www.ncbi.nlm.nih.gov/snp/${snp.rsid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-indigo-600 shadow-sm hover:bg-indigo-100"
              >
                dbSNP →
              </a>
              <a 
                href={`https://www.snpedia.com/index.php/${snp.rsid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-indigo-600 shadow-sm hover:bg-indigo-100"
              >
                SNPedia →
              </a>
              {snp.gene && (
                <a 
                  href={`https://www.genecards.org/cgi-bin/carddisp.pl?gene=${snp.gene}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-indigo-600 shadow-sm hover:bg-indigo-100"
                >
                  GeneCards →
                </a>
              )}
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-lg bg-slate-50 p-5">
          <p className="text-slate-500">
            No specific gene is associated with this variant in our database. 
            The variant may still have biological significance but more research is needed.
          </p>
        </section>
      )}

      {/* Disclaimer */}
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm text-amber-800">
          <span className="font-semibold">⚠️ Important:</span> Genetic research is constantly evolving. 
          New studies may change our understanding of how these variants affect health. 
          Always consult a genetic counselor or doctor for personal advice.
        </p>
      </section>
    </div>
  )
}

function TabDetails({ snp }: { snp: SnpMatch }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-slate-900">Technical Details</h3>
      
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-200">
            <DetailRow label="SNP ID" value={snp.rsid} />
            <DetailRow label="Genotype" value={snp.genotype} mono />
            <DetailRow label="Gene" value={snp.gene || 'Not associated'} />
            <DetailRow label="Category" value={snp.category || 'Neutral'} />
            <DetailRow label="Weight" value={String(snp.weight)} />
            <DetailRow label="Description" value={snp.description || 'None'} />
            <DetailRow label="Key" value={snp.key} mono />
          </tbody>
        </table>
      </div>

      <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-semibold text-slate-700">Disclaimer</p>
        <p className="mt-1">
          This information is for educational purposes only and should not be used as medical advice. 
          Always consult a doctor or genetic counselor for personal advice.
        </p>
      </div>
    </div>
  )
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <tr>
      <td className="bg-slate-50 px-4 py-3 font-medium text-slate-700">{label}</td>
      <td className={`px-4 py-3 ${mono ? 'font-mono' : ''}`}>{value}</td>
    </tr>
  )
}

