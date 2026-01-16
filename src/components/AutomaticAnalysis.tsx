/**
 * AutomaticAnalysis - Shows learned topics from chat questions
 * Displayed in a separate section on the website
 */

import { useState, useEffect } from 'react'
import { dnaState } from '../dna/dnaState'
import type { SnpMatchResult, SnpMatch } from '../dna-analysis/SnpMatcher'
import { getAutoAnalyzeTopics } from '../learning'

interface LearnedTopic {
  id: string
  display_name: string
  snps: string[]
  category: string
}

const categoryIcons: Record<string, string> = {
  trait: '🎨',
  cancer_risk: '🔬',
  disease_risk: '⚕️',
  metabolism: '⚡',
  other: '🧬',
}

const categoryDescriptions: Record<string, string> = {
  trait: 'Physical characteristics influenced by your genes',
  cancer_risk: 'Genetic markers associated with cancer risk',
  disease_risk: 'Genetic predisposition to various conditions',
  metabolism: 'How your body processes substances',
  other: 'Other genetic insights',
}

const topicDescriptions: Record<string, string> = {
  eye_color: 'Analysis of genes that determine eye pigmentation.',
  hair_color: 'Genes that influence hair pigmentation and color.',
  caffeine: 'How your body metabolizes caffeine.',
  lactose: 'Your ability to digest lactose in dairy products.',
  vitamin_d: 'How efficiently you process vitamin D.',
  earwax: 'The gene that determines your earwax type.',
  alcohol: 'How your body breaks down alcohol.',
  celiac: 'Genetic markers for celiac disease risk.',
  brca: 'BRCA gene variants for cancer risk.',
  alzheimers: 'Genetic factors for Alzheimer\'s risk.',
  parkinsons: 'Genetic markers for Parkinson\'s disease.',
  clotting: 'Variants affecting blood clotting.',
  muscle: 'Genes influencing muscle fiber composition.',
  bitter_taste: 'Your ability to taste bitter compounds.',
  sleep: 'Genetic influences on sleep patterns.',
  glaucoma: 'Genetic markers associated with glaucoma and eye pressure.',
  macular_degeneration: 'Risk factors for age-related macular degeneration.',
  heart_disease: 'Genetic variants linked to cardiovascular disease risk.',
  diabetes_type2: 'Markers associated with type 2 diabetes risk.',
}

// Interpretation functions for each topic based on genotype
type GenotypeInterpretation = {
  result: string
  detail: string
  icon?: string
}

function interpretGenotype(topicId: string, snpData: Map<string, string>): GenotypeInterpretation | null {
  switch (topicId) {
    case 'eye_color': {
      const rs12913832 = snpData.get('rs12913832')?.toUpperCase()
      if (rs12913832) {
        if (rs12913832.includes('G') && rs12913832.includes('G')) {
          return { result: 'Likely Blue/Green Eyes', detail: 'GG genotype strongly associated with blue or green eye color', icon: '👁️' }
        } else if (rs12913832.includes('A') && rs12913832.includes('G')) {
          return { result: 'Mixed - Could be Blue, Green or Hazel', detail: 'AG genotype shows intermediate eye color tendency', icon: '👁️' }
        } else if (rs12913832.includes('A') && rs12913832.includes('A')) {
          return { result: 'Likely Brown Eyes', detail: 'AA genotype strongly associated with brown eye color', icon: '👁️' }
        }
      }
      return null
    }
    case 'hair_color': {
      const rs1805007 = snpData.get('rs1805007')?.toUpperCase()
      if (rs1805007) {
        if (rs1805007.includes('T')) {
          return { result: 'Red Hair Variant Present', detail: 'You carry a variant associated with red hair (MC1R gene)', icon: '🧑‍🦰' }
        } else {
          return { result: 'No Red Hair Variant', detail: 'Standard hair color genetics', icon: '💇' }
        }
      }
      return null
    }
    case 'caffeine': {
      const rs762551 = snpData.get('rs762551')?.toUpperCase()
      if (rs762551) {
        if (rs762551.includes('A') && rs762551.includes('A')) {
          return { result: 'Fast Caffeine Metabolizer', detail: 'You process caffeine quickly - coffee has shorter effect', icon: '☕' }
        } else if (rs762551.includes('C')) {
          return { result: 'Slow Caffeine Metabolizer', detail: 'Caffeine stays in your system longer - limit intake for better sleep', icon: '😴' }
        }
      }
      return null
    }
    case 'lactose': {
      const rs4988235 = snpData.get('rs4988235')?.toUpperCase()
      if (rs4988235) {
        if (rs4988235.includes('T')) {
          return { result: 'Lactose Tolerant', detail: 'You likely produce lactase and can digest dairy', icon: '🥛' }
        } else {
          return { result: 'Likely Lactose Intolerant', detail: 'You may have reduced ability to digest lactose', icon: '🚫' }
        }
      }
      return null
    }
    case 'earwax': {
      const rs17822931 = snpData.get('rs17822931')?.toUpperCase()
      if (rs17822931) {
        if (rs17822931.includes('T') && rs17822931.includes('T')) {
          return { result: 'Dry Earwax Type', detail: 'TT genotype - dry, flaky earwax (common in East Asian populations)', icon: '👂' }
        } else if (rs17822931.includes('C')) {
          return { result: 'Wet Earwax Type', detail: 'CC or CT genotype - wet, sticky earwax', icon: '👂' }
        }
      }
      return null
    }
    case 'alcohol': {
      const rs671 = snpData.get('rs671')?.toUpperCase()
      if (rs671) {
        if (rs671.includes('A')) {
          return { result: 'Alcohol Flush Response', detail: 'You may experience facial flushing when drinking alcohol', icon: '🍷' }
        } else {
          return { result: 'Normal Alcohol Metabolism', detail: 'Standard ALDH2 enzyme activity', icon: '✓' }
        }
      }
      return null
    }
    case 'muscle': {
      const rs1815739 = snpData.get('rs1815739')?.toUpperCase()
      if (rs1815739) {
        if (rs1815739.includes('C') && rs1815739.includes('C')) {
          return { result: 'Power/Sprint Athlete Type', detail: 'CC genotype - higher proportion of fast-twitch muscle fibers', icon: '🏃' }
        } else if (rs1815739.includes('T') && rs1815739.includes('T')) {
          return { result: 'Endurance Athlete Type', detail: 'TT genotype - may excel in endurance activities', icon: '🚴' }
        } else {
          return { result: 'Mixed Muscle Type', detail: 'CT genotype - balanced muscle fiber composition', icon: '💪' }
        }
      }
      return null
    }
    case 'bitter_taste': {
      const rs713598 = snpData.get('rs713598')?.toUpperCase()
      if (rs713598) {
        if (rs713598.includes('G')) {
          return { result: 'Bitter Taste Sensitive', detail: 'You can taste bitter compounds strongly (supertaster)', icon: '👅' }
        } else {
          return { result: 'Less Bitter Sensitive', detail: 'You may not taste bitter compounds as strongly', icon: '👅' }
        }
      }
      return null
    }
    case 'sleep': {
      const rs57875989 = snpData.get('rs57875989')?.toUpperCase()
      if (rs57875989) {
        if (rs57875989.includes('A')) {
          return { result: 'Early Bird Tendency', detail: 'Genetic tendency toward being a morning person', icon: '🌅' }
        } else {
          return { result: 'Night Owl Tendency', detail: 'Genetic tendency toward being an evening person', icon: '🌙' }
        }
      }
      return null
    }
    case 'vitamin_d': {
      const rs2282679 = snpData.get('rs2282679')?.toUpperCase()
      if (rs2282679) {
        if (rs2282679.includes('C')) {
          return { result: 'Lower Vitamin D Levels', detail: 'You may need more sun exposure or supplementation', icon: '☀️' }
        } else {
          return { result: 'Normal Vitamin D Metabolism', detail: 'Standard vitamin D processing ability', icon: '✓' }
        }
      }
      return null
    }
    case 'glaucoma': {
      const rs10483727 = snpData.get('rs10483727')?.toUpperCase()
      if (rs10483727) {
        if (rs10483727.includes('T')) {
          return { result: 'Increased Glaucoma Risk', detail: 'You carry a variant associated with higher glaucoma risk - regular eye exams recommended', icon: '👁️' }
        } else {
          return { result: 'Lower Glaucoma Risk', detail: 'No high-risk variants detected for this marker', icon: '✓' }
        }
      }
      return null
    }
    case 'macular_degeneration': {
      const rs1061170 = snpData.get('rs1061170')?.toUpperCase()
      if (rs1061170) {
        if (rs1061170.includes('C')) {
          return { result: 'Increased AMD Risk', detail: 'You carry CFH gene variants associated with age-related macular degeneration', icon: '👁️' }
        } else {
          return { result: 'Lower AMD Risk', detail: 'No high-risk CFH variants detected', icon: '✓' }
        }
      }
      return null
    }
    case 'heart_disease': {
      const rs1333049 = snpData.get('rs1333049')?.toUpperCase()
      if (rs1333049) {
        if (rs1333049.includes('C')) {
          return { result: 'Higher Heart Disease Risk', detail: 'CC genotype associated with increased cardiovascular risk - lifestyle factors important', icon: '❤️' }
        } else {
          return { result: 'Lower Heart Disease Risk', detail: 'No high-risk variant at this marker', icon: '✓' }
        }
      }
      return null
    }
    case 'diabetes_type2': {
      const rs7903146 = snpData.get('rs7903146')?.toUpperCase()
      if (rs7903146) {
        if (rs7903146.includes('T')) {
          return { result: 'Higher Type 2 Diabetes Risk', detail: 'TCF7L2 gene variant associated with increased diabetes risk - diet and exercise important', icon: '🩸' }
        } else {
          return { result: 'Lower Diabetes Risk', detail: 'No high-risk TCF7L2 variant detected', icon: '✓' }
        }
      }
      return null
    }
    default:
      return null
  }
}

export default function AutomaticAnalysis() {
  const [learnedTopics, setLearnedTopics] = useState<LearnedTopic[]>([])
  const [snpResult, setSnpResult] = useState<SnpMatchResult | null>(dnaState.snpMatchResult)
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null)

  useEffect(() => {
    async function loadLearnedTopics() {
      const topics = await getAutoAnalyzeTopics()
      setLearnedTopics(topics)
    }
    loadLearnedTopics()
  }, [])

  useEffect(() => {
    const syncState = () => {
      setSnpResult(dnaState.snpMatchResult)
    }

    window.addEventListener('dna-analysis-complete', syncState)
    return () => {
      window.removeEventListener('dna-analysis-complete', syncState)
    }
  }, [])

  if (learnedTopics.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Loading analysis topics...</p>
      </div>
    )
  }

  // Build map of user's SNP data (rsid -> genotype)
  const userSnpData = new Map<string, string>()
  if (snpResult) {
    for (const match of snpResult.matches) {
      userSnpData.set(match.rsid.toLowerCase(), match.userGenotype)
    }
  }
  
  // Check which SNPs from topics are in user's data
  const userRsids = new Set(userSnpData.keys())

  const toggleExpanded = (topicId: string) => {
    setExpandedTopic(expandedTopic === topicId ? null : topicId)
  }

  return (
    <div className="row g-4">
      {learnedTopics.map(topic => {
        const matchedSnps = topic.snps.filter(snp => userRsids.has(snp.toLowerCase()))
        const hasMatches = matchedSnps.length > 0
        const isExpanded = expandedTopic === topic.id
        
        return (
          <div key={topic.id} className="col-md-6 col-lg-4">
            <div 
              className={`analysis-card position-relative ${hasMatches ? 'has-match' : ''} ${isExpanded ? 'expanded' : ''}`}
              onClick={() => toggleExpanded(topic.id)}
            >
              <div className="d-flex align-items-start gap-3">
                <div className="category-icon">
                  {categoryIcons[topic.category] || '🧬'}
                </div>
                <div className="flex-grow-1">
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <h5 className="mb-0 fw-semibold" style={{ fontSize: '16px' }}>
                      {topic.display_name}
                    </h5>
                    {hasMatches && (
                      <span className="match-badge">
                        {matchedSnps.length} match{matchedSnps.length !== 1 ? 'es' : ''}
                      </span>
                    )}
                  </div>
                  <p className="mb-0 text-muted" style={{ fontSize: '13px' }}>
                    {topic.snps.length} SNPs analyzed
                    {hasMatches && (
                      <span className="ms-2" style={{ color: 'var(--theme-color)' }}>
                        • Data found
                      </span>
                    )}
                  </p>
                </div>
              </div>
              
              {/* Expanded details */}
              <div className="analysis-details">
                <p className="text-muted mb-3" style={{ fontSize: '14px' }}>
                  {topicDescriptions[topic.id] || categoryDescriptions[topic.category] || 'Genetic analysis for this trait.'}
                </p>
                
                {hasMatches ? (
                  <div>
                    {/* Show interpretation result */}
                    {(() => {
                      const interpretation = interpretGenotype(topic.id, userSnpData)
                      if (interpretation) {
                        return (
                          <div className="mb-3 p-3" style={{ backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <span style={{ fontSize: '20px' }}>{interpretation.icon}</span>
                              <span className="fw-bold" style={{ color: '#166534', fontSize: '15px' }}>
                                {interpretation.result}
                              </span>
                            </div>
                            <p className="mb-0" style={{ fontSize: '13px', color: '#166534' }}>
                              {interpretation.detail}
                            </p>
                          </div>
                        )
                      }
                      return (
                        <p className="fw-semibold mb-2" style={{ fontSize: '13px', color: 'var(--theme-color)' }}>
                          ✓ Data found - detailed interpretation coming soon
                        </p>
                      )
                    })()}
                    
                    <p className="text-muted mb-2" style={{ fontSize: '12px' }}>Your genotypes:</p>
                    <div className="d-flex flex-wrap gap-2">
                      {matchedSnps.slice(0, 5).map(snp => {
                        const genotype = userSnpData.get(snp.toLowerCase())
                        return (
                          <span 
                            key={snp} 
                            className="badge"
                            style={{ fontSize: '11px', backgroundColor: '#e2e8f0', color: '#334155' }}
                          >
                            {snp.toUpperCase()}: <strong>{genotype || '?'}</strong>
                          </span>
                        )
                      })}
                      {matchedSnps.length > 5 && (
                        <span className="badge bg-light text-muted" style={{ fontSize: '11px' }}>
                          +{matchedSnps.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted mb-0" style={{ fontSize: '13px' }}>
                    Upload your DNA data to see results for this analysis.
                  </p>
                )}
                
                <div className="mt-3">
                  <small className="text-muted">
                    SNPs: {topic.snps.map(s => s.toUpperCase()).join(', ')}
                  </small>
                </div>
              </div>
              
              {/* Expand indicator */}
              <div className="text-center mt-2">
                <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-muted`} style={{ fontSize: '12px' }}></i>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
