/**
 * SnpEnrichmentApi - Frontend service for AI-enriched SNP explanations
 * 
 * Calls backend to get AI explanations for matched SNPs.
 * Backend caches responses to reduce API calls over time.
 */

import type { SnpMatch } from './SnpMatcher'

const API_BASE = 'http://localhost:3001'

export interface EnrichedSnp extends SnpMatch {
  aiExplanation?: string
  aiRiskLevel?: 'low' | 'moderate' | 'elevated' | 'high'
  aiHealthImplications?: string[]
  aiRecommendations?: string[]
  fromCache?: boolean
  aiError?: boolean
}

export interface EnrichmentResult {
  enrichedSnps: EnrichedSnp[]
  stats: {
    total: number
    fromCache: number
    newlyEnriched: number
    errors: number
  }
}

/**
 * Enrich matched SNPs with AI explanations
 * @param snps Array of matched SNPs to enrich
 * @param maxToEnrich Maximum number of SNPs to send for AI enrichment (to control costs)
 */
export async function enrichSnpsWithAi(
  snps: SnpMatch[],
  maxToEnrich: number = 50
): Promise<EnrichmentResult> {
  // Prioritize significant SNPs for enrichment
  const prioritized = [...snps]
    .sort((a, b) => {
      // Bad category first
      if (a.category === 'Bad' && b.category !== 'Bad') return -1
      if (b.category === 'Bad' && a.category !== 'Bad') return 1
      // Then by weight
      return b.weight - a.weight
    })
    .slice(0, maxToEnrich)

  if (prioritized.length === 0) {
    return {
      enrichedSnps: [],
      stats: { total: 0, fromCache: 0, newlyEnriched: 0, errors: 0 }
    }
  }

  try {
    const response = await fetch(`${API_BASE}/api/snp/enrich`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ snps: prioritized }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const result: EnrichmentResult = await response.json()
    
    console.log('[SnpEnrichmentApi] Enrichment complete:', result.stats)
    
    return result
  } catch (error) {
    console.error('[SnpEnrichmentApi] Failed to enrich SNPs:', error)
    
    // Return original SNPs without enrichment
    return {
      enrichedSnps: snps.slice(0, maxToEnrich).map(s => ({ ...s, aiError: true })),
      stats: { total: snps.length, fromCache: 0, newlyEnriched: 0, errors: snps.length }
    }
  }
}

/**
 * Get cache statistics from backend
 */
export async function getCacheStats(): Promise<{ size: number; keys: string[] }> {
  try {
    const response = await fetch(`${API_BASE}/api/snp/cache-stats`)
    if (!response.ok) throw new Error('Failed to get cache stats')
    return await response.json()
  } catch (error) {
    console.error('[SnpEnrichmentApi] Failed to get cache stats:', error)
    return { size: 0, keys: [] }
  }
}

/**
 * Check if backend is available
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/health`)
    return response.ok
  } catch {
    return false
  }
}

// =============================================================================
// Chat Explanation Generation
// =============================================================================

export interface SnpChatExplanation {
  rsid: string
  genotype: string
  gene: string | null
  title: string
  explanation: string
  riskLevel: string
  recommendation: string
  fromCache: boolean
}

export interface ChatGenerationResult {
  chatMessage: string
  snpDetails: SnpChatExplanation[]
  stats: {
    total: number
    fromCache: number
    generated: number
  }
}

/**
 * Generate a comprehensive chat explanation for risk SNPs
 * Backend caches explanations per-SNP in individual files
 */
export async function generateRiskChat(
  riskSnps: SnpMatch[]
): Promise<ChatGenerationResult | null> {
  if (riskSnps.length === 0) {
    return null
  }

  try {
    const response = await fetch(`${API_BASE}/api/snp/generate-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ riskSnps }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const result: ChatGenerationResult = await response.json()
    console.log('[SnpEnrichmentApi] Chat generation complete:', result.stats)
    
    return result
  } catch (error) {
    console.error('[SnpEnrichmentApi] Failed to generate chat:', error)
    return null
  }
}
