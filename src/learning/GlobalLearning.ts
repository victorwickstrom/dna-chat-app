/**
 * Global Learning System
 * 
 * Tracks what users ask about in chat and expands analysis globally.
 * When a user asks about a topic (like BRCA), the system:
 * 1. Records the request
 * 2. Fetches relevant SNP data from SNPedia
 * 3. Adds it to the global knowledge base
 * 4. All future users benefit from this expanded analysis
 */

import { fetchSNP, setCSR, hasCSR } from '../snpedia'
import type { CanonicalSNPRecord } from '../snpedia'

// =============================================================================
// Types
// =============================================================================

export interface TopicRequest {
  topic: string
  keywords: string[]
  requested_at: number
  request_count: number
  snps_added: string[]
  status: 'pending' | 'fetching' | 'complete' | 'failed'
}

export interface GlobalLearningState {
  topic_requests: Record<string, TopicRequest>
  total_requests: number
  last_updated: number
  version: string
}

// =============================================================================
// Known Topic → SNP Mappings
// =============================================================================

const TOPIC_SNP_MAPPINGS: Record<string, { keywords: string[], snps: CanonicalSNPRecord[] }> = {
  brca: {
    keywords: ['brca', 'brca1', 'brca2', 'bröstcancer', 'breast cancer', 'ovariecancer', 'ovarian'],
    snps: [
      {
        rsid: 'rs80357906',
        gene: 'BRCA1',
        functional_role: 'BRCA1 pathogenic variant associated with hereditary breast and ovarian cancer',
        effects: {
          'A': { effect: 'Pathogenic variant - significantly increased cancer risk', associated_traits: ['breast_cancer_risk', 'ovarian_cancer_risk'], strength: 'strong', risk_direction: 'increased' },
          'G': { effect: 'Normal/wild-type', associated_traits: ['normal_risk'], strength: 'strong' },
        },
        phenotype_domain: 'cancer_risk',
        confidence: 'high',
        notes: ['Pathogenic BRCA1 variant', 'Associated with hereditary breast and ovarian cancer syndrome', 'Genetic counseling recommended if present'],
        source: 'SNPedia',
        version: '2025-01-01',
        fetched_at: Date.now(),
      },
      {
        rsid: 'rs80358981',
        gene: 'BRCA2',
        functional_role: 'BRCA2 pathogenic variant associated with hereditary breast cancer',
        effects: {
          'T': { effect: 'Pathogenic variant - increased cancer risk', associated_traits: ['breast_cancer_risk'], strength: 'strong', risk_direction: 'increased' },
          'C': { effect: 'Normal/wild-type', associated_traits: ['normal_risk'], strength: 'strong' },
        },
        phenotype_domain: 'cancer_risk',
        confidence: 'high',
        notes: ['BRCA2 pathogenic variant', 'Associated with hereditary breast cancer', 'Also affects male breast cancer risk'],
        source: 'SNPedia',
        version: '2025-01-01',
        fetched_at: Date.now(),
      },
      {
        rsid: 'rs1799950',
        gene: 'BRCA1',
        functional_role: 'BRCA1 variant (Q356R) with possible increased cancer risk',
        effects: {
          'A': { effect: 'Variant allele - possibly increased risk', associated_traits: ['breast_cancer_risk'], strength: 'moderate', risk_direction: 'increased' },
          'G': { effect: 'Common allele', associated_traits: ['normal_risk'], strength: 'moderate' },
        },
        phenotype_domain: 'cancer_risk',
        confidence: 'medium',
        notes: ['Q356R variant', 'Some studies show modest risk increase', 'More common than pathogenic variants'],
        source: 'SNPedia',
        version: '2025-01-01',
        fetched_at: Date.now(),
      },
      {
        rsid: 'rs1799966',
        gene: 'BRCA1',
        functional_role: 'BRCA1 variant (P871L) - common polymorphism',
        effects: {
          'T': { effect: 'Variant allele', associated_traits: ['breast_cancer_risk'], strength: 'weak', risk_direction: 'increased' },
          'C': { effect: 'Common allele', associated_traits: ['normal_risk'], strength: 'moderate' },
        },
        phenotype_domain: 'cancer_risk',
        confidence: 'medium',
        notes: ['P871L polymorphism', 'Very common variant', 'Effect size is small'],
        source: 'SNPedia',
        version: '2025-01-01',
        fetched_at: Date.now(),
      },
      {
        rsid: 'rs16942',
        gene: 'BRCA1',
        functional_role: 'BRCA1 variant (E1038G) - common polymorphism',
        effects: {
          'T': { effect: 'Variant allele - linked to other BRCA1 variants', associated_traits: ['breast_cancer_risk'], strength: 'weak' },
          'C': { effect: 'Common allele', associated_traits: ['normal_risk'], strength: 'moderate' },
        },
        phenotype_domain: 'cancer_risk',
        confidence: 'medium',
        notes: ['E1038G polymorphism', 'Often in linkage with other variants', 'Used in haplotype analysis'],
        source: 'SNPedia',
        version: '2025-01-01',
        fetched_at: Date.now(),
      },
    ],
  },
  
  alzheimers: {
    keywords: ['alzheimer', 'demens', 'dementia', 'apoe', 'apoe4', 'minne', 'memory loss'],
    snps: [
      {
        rsid: 'rs429358',
        gene: 'APOE',
        functional_role: 'APOE ε4 determining variant - major Alzheimer risk factor',
        effects: {
          'C': { effect: 'APOE ε4 allele - increased Alzheimer risk (3-15x)', associated_traits: ['alzheimers_risk', 'cardiovascular_risk'], strength: 'strong', risk_direction: 'increased' },
          'T': { effect: 'APOE ε2/ε3 allele - normal or reduced risk', associated_traits: ['normal_risk'], strength: 'strong' },
        },
        phenotype_domain: 'alzheimers_risk',
        confidence: 'high',
        notes: ['Strongest genetic risk factor for late-onset Alzheimer', 'ε4/ε4 has highest risk', 'Also affects cholesterol metabolism'],
        source: 'SNPedia',
        version: '2025-01-01',
        fetched_at: Date.now(),
      },
      {
        rsid: 'rs7412',
        gene: 'APOE',
        functional_role: 'APOE ε2 determining variant - protective against Alzheimer',
        effects: {
          'T': { effect: 'APOE ε2 allele - reduced Alzheimer risk', associated_traits: ['alzheimers_protection'], strength: 'strong', risk_direction: 'decreased' },
          'C': { effect: 'APOE ε3/ε4 allele', associated_traits: ['normal_risk'], strength: 'strong' },
        },
        phenotype_domain: 'alzheimers_risk',
        confidence: 'high',
        notes: ['ε2 allele is protective', 'Combined with rs429358 determines APOE type', 'ε2/ε2 has lowest risk'],
        source: 'SNPedia',
        version: '2025-01-01',
        fetched_at: Date.now(),
      },
    ],
  },
  
  parkinsons: {
    keywords: ['parkinson', 'lrrk2', 'gba', 'tremor', 'rörelsesjukdom'],
    snps: [
      {
        rsid: 'rs34637584',
        gene: 'LRRK2',
        functional_role: 'LRRK2 G2019S - most common Parkinson mutation',
        effects: {
          'A': { effect: 'G2019S mutation - significantly increased Parkinson risk', associated_traits: ['parkinsons_risk'], strength: 'strong', risk_direction: 'increased' },
          'G': { effect: 'Normal/wild-type', associated_traits: ['normal_risk'], strength: 'strong' },
        },
        phenotype_domain: 'other',
        confidence: 'high',
        notes: ['Most common genetic cause of Parkinson', 'Incomplete penetrance', 'More common in Ashkenazi Jewish and North African populations'],
        source: 'SNPedia',
        version: '2025-01-01',
        fetched_at: Date.now(),
      },
    ],
  },
  
  celiac: {
    keywords: ['celiaki', 'celiac', 'gluten', 'hla-dq2', 'hla-dq8', 'glutenkänslighet'],
    snps: [
      {
        rsid: 'rs2187668',
        gene: 'HLA-DQA1',
        functional_role: 'HLA-DQ2.5 haplotype marker - major celiac disease risk',
        effects: {
          'T': { effect: 'HLA-DQ2.5 positive - required for celiac disease', associated_traits: ['celiac_risk', 'gluten_sensitivity'], strength: 'strong', risk_direction: 'increased' },
          'C': { effect: 'HLA-DQ2.5 negative', associated_traits: ['reduced_celiac_risk'], strength: 'strong' },
        },
        phenotype_domain: 'immune_response',
        confidence: 'high',
        notes: ['~95% of celiac patients carry HLA-DQ2', 'Necessary but not sufficient for celiac', 'Also associated with Type 1 diabetes'],
        source: 'SNPedia',
        version: '2025-01-01',
        fetched_at: Date.now(),
      },
      {
        rsid: 'rs7454108',
        gene: 'HLA-DQB1',
        functional_role: 'HLA-DQ8 haplotype marker - celiac disease risk',
        effects: {
          'C': { effect: 'HLA-DQ8 positive - celiac disease risk', associated_traits: ['celiac_risk'], strength: 'moderate', risk_direction: 'increased' },
          'T': { effect: 'HLA-DQ8 negative', associated_traits: ['normal_risk'], strength: 'moderate' },
        },
        phenotype_domain: 'immune_response',
        confidence: 'high',
        notes: ['~5% of celiac patients carry HLA-DQ8 without DQ2', 'Also associated with Type 1 diabetes'],
        source: 'SNPedia',
        version: '2025-01-01',
        fetched_at: Date.now(),
      },
    ],
  },
  
  clotting: {
    keywords: ['blodpropp', 'trombos', 'thrombosis', 'dvt', 'factor v', 'leiden', 'koagulation', 'clotting'],
    snps: [
      {
        rsid: 'rs6025',
        gene: 'F5',
        functional_role: 'Factor V Leiden - most common inherited thrombophilia',
        effects: {
          'T': { effect: 'Factor V Leiden mutation - 5-10x increased clot risk', associated_traits: ['thrombosis_risk', 'dvt_risk'], strength: 'strong', risk_direction: 'increased' },
          'C': { effect: 'Normal Factor V', associated_traits: ['normal_risk'], strength: 'strong' },
        },
        phenotype_domain: 'cardiovascular',
        confidence: 'high',
        notes: ['Most common inherited clotting disorder', 'Higher risk with oral contraceptives', 'Homozygotes have 50-100x risk'],
        source: 'SNPedia',
        version: '2025-01-01',
        fetched_at: Date.now(),
      },
      {
        rsid: 'rs1799963',
        gene: 'F2',
        functional_role: 'Prothrombin G20210A - increased clotting risk',
        effects: {
          'A': { effect: 'Prothrombin mutation - 2-5x increased clot risk', associated_traits: ['thrombosis_risk'], strength: 'strong', risk_direction: 'increased' },
          'G': { effect: 'Normal prothrombin', associated_traits: ['normal_risk'], strength: 'strong' },
        },
        phenotype_domain: 'cardiovascular',
        confidence: 'high',
        notes: ['Second most common inherited thrombophilia', 'Combined with Factor V Leiden increases risk further'],
        source: 'SNPedia',
        version: '2025-01-01',
        fetched_at: Date.now(),
      },
    ],
  },
}

// =============================================================================
// Storage (Server-side - persists across all users)
// =============================================================================

const API_BASE = ''

/**
 * Record a question to the server for global learning
 */
async function recordQuestionToServer(question: string): Promise<{
  detected_topics: string[]
  new_topics_added: string[]
  auto_analyze_count: number
} | null> {
  try {
    const response = await fetch(`${API_BASE}/api/learning/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    })
    
    if (!response.ok) {
      console.warn('[GlobalLearning] Server returned error:', response.status)
      return null
    }
    
    return await response.json()
  } catch (e) {
    console.warn('[GlobalLearning] Failed to record to server:', e)
    return null
  }
}

/**
 * Get auto-analyze topics from server
 */
export async function getAutoAnalyzeTopics(): Promise<{
  id: string
  display_name: string
  snps: string[]
  category: string
}[]> {
  try {
    const response = await fetch(`${API_BASE}/api/learning/auto-analyze`)
    if (!response.ok) return []
    
    const data = await response.json()
    return data.topics || []
  } catch (e) {
    console.warn('[GlobalLearning] Failed to get auto-analyze topics:', e)
    return []
  }
}

/**
 * Get SNPs that should be analyzed based on learned topics
 */
export async function getLearnedSNPs(): Promise<string[]> {
  try {
    const response = await fetch(`${API_BASE}/api/learning/snps-for-topics`)
    if (!response.ok) return []
    
    const data = await response.json()
    return data.snps || []
  } catch (e) {
    console.warn('[GlobalLearning] Failed to get learned SNPs:', e)
    return []
  }
}

// =============================================================================
// Topic Detection
// =============================================================================

/**
 * Detect topics from a user's question
 */
export function detectTopicsInQuestion(question: string): string[] {
  const lower = question.toLowerCase()
  const detectedTopics: string[] = []
  
  for (const [topic, { keywords }] of Object.entries(TOPIC_SNP_MAPPINGS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        if (!detectedTopics.includes(topic)) {
          detectedTopics.push(topic)
        }
        break
      }
    }
  }
  
  return detectedTopics
}

/**
 * Record that a topic was requested and expand the knowledge base
 * Uses SERVER API for global persistence across all users
 */
export async function learnFromQuestion(question: string): Promise<{ 
  topics_detected: string[], 
  snps_added: string[],
  already_known: string[]
}> {
  const topics = detectTopicsInQuestion(question)
  const snpsAdded: string[] = []
  const alreadyKnown: string[] = []
  
  // Record to server for global learning
  const serverResult = await recordQuestionToServer(question)
  if (serverResult) {
    console.log(`[GlobalLearning] Server recorded: ${serverResult.detected_topics.join(', ')}`)
    if (serverResult.new_topics_added.length > 0) {
      console.log(`[GlobalLearning] New topics added to auto-analyze: ${serverResult.new_topics_added.join(', ')}`)
      // Notify listeners that topics have been updated
      window.dispatchEvent(new CustomEvent('topics-updated', { detail: { newTopics: serverResult.new_topics_added } }))
    }
  }
  
  // Also add SNPs to local CSR cache for immediate use
  for (const topic of topics) {
    const mapping = TOPIC_SNP_MAPPINGS[topic]
    if (mapping) {
      for (const snp of mapping.snps) {
        if (hasCSR(snp.rsid)) {
          alreadyKnown.push(snp.rsid)
        } else {
          setCSR(snp)
          snpsAdded.push(snp.rsid)
        }
      }
    }
  }
  
  if (snpsAdded.length > 0) {
    console.log(`[GlobalLearning] Added ${snpsAdded.length} new SNPs to local cache for topics: ${topics.join(', ')}`)
  }
  
  return {
    topics_detected: topics,
    snps_added: snpsAdded,
    already_known: alreadyKnown,
  }
}

/**
 * Get statistics about what the system has learned (from server)
 */
export async function getLearningStats(): Promise<{
  topics_learned: string[],
  total_requests: number,
  auto_analyze_count: number
}> {
  try {
    const response = await fetch(`${API_BASE}/api/learning`)
    if (!response.ok) {
      return { topics_learned: [], total_requests: 0, auto_analyze_count: 0 }
    }
    
    const data = await response.json()
    return {
      topics_learned: data.auto_analyze || [],
      total_requests: data.total_requests || 0,
      auto_analyze_count: (data.auto_analyze || []).length,
    }
  } catch (e) {
    console.warn('[GlobalLearning] Failed to get stats:', e)
    return { topics_learned: [], total_requests: 0, auto_analyze_count: 0 }
  }
}

/**
 * Get all available topics that the system can learn about
 */
export function getAvailableTopics(): string[] {
  return Object.keys(TOPIC_SNP_MAPPINGS)
}

/**
 * Manually add a topic to the knowledge base (server + local)
 */
export async function expandKnowledgeForTopic(topic: string): Promise<string[]> {
  const snpsAdded: string[] = []
  
  const mapping = TOPIC_SNP_MAPPINGS[topic]
  if (!mapping) {
    console.warn(`[GlobalLearning] Unknown topic: ${topic}`)
    return []
  }
  
  // Add to server
  try {
    await fetch(`${API_BASE}/api/learning/add-topic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
    })
  } catch (e) {
    console.warn('[GlobalLearning] Failed to add topic to server:', e)
  }
  
  // Add SNPs to local cache
  for (const snp of mapping.snps) {
    if (!hasCSR(snp.rsid)) {
      setCSR(snp)
      snpsAdded.push(snp.rsid)
    }
  }
  
  return snpsAdded
}

/**
 * Initialize learning system
 */
export async function initGlobalLearning(): Promise<void> {
  console.log('[GlobalLearning] Initializing...')
  
  // Get current stats from server
  const stats = await getLearningStats()
  if (stats.total_requests > 0) {
    console.log(`[GlobalLearning] Server stats: ${stats.topics_learned.length} topics auto-analyzing, ${stats.total_requests} total requests`)
  }
  
  // Pre-load SNPs for auto-analyze topics
  const autoTopics = await getAutoAnalyzeTopics()
  for (const topic of autoTopics) {
    const mapping = TOPIC_SNP_MAPPINGS[topic.id]
    if (mapping) {
      for (const snp of mapping.snps) {
        if (!hasCSR(snp.rsid)) {
          setCSR(snp)
        }
      }
    }
  }
  
  if (autoTopics.length > 0) {
    console.log(`[GlobalLearning] Pre-loaded SNPs for ${autoTopics.length} auto-analyze topics`)
  }
}
