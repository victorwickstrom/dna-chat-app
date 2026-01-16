/**
 * SNPedia Integration Module
 * 
 * Provides Canonical SNP Records (CSR) for deterministic genetic knowledge.
 * 
 * Usage:
 *   import { getCSRForUser, seedCommonSNPs } from './snpedia'
 *   
 *   // On app init
 *   seedCommonSNPs()
 *   
 *   // When answering questions
 *   const context = await getCSRForUser(userSnps, relevantRsids)
 */

// Types
export type {
  CanonicalSNPRecord,
  AlleleEffect,
  ConfidenceLevel,
  EffectStrength,
  CSRCache,
  CSRFetchResult,
  CSRQuery,
  CSRQueryResult,
  CompactSNPInfo,
  CompactTraitContext,
  PhenotypeDomain,
} from './CSRTypes'

export {
  toCompactFormat,
  estimateTokens,
  PHENOTYPE_DOMAINS,
} from './CSRTypes'

// Cache operations
export {
  loadCache,
  saveCache,
  getCSR,
  setCSR,
  setCSRBatch,
  hasCSR,
  queryCSR,
  getAllCSR,
  getCacheStats,
  clearCache,
  exportCache,
  importCache,
} from './CSRCache'

// Fetching
export {
  fetchSNP,
  fetchSNPBatch,
  seedCommonSNPs,
} from './SNPediaFetcher'

// =============================================================================
// High-Level API
// =============================================================================

import type { CompactSNPInfo, CompactTraitContext } from './CSRTypes'
import { toCompactFormat } from './CSRTypes'
import { getCSR, queryCSR } from './CSRCache'
import { fetchSNP, seedCommonSNPs as seed } from './SNPediaFetcher'

/**
 * Initialize SNPedia module - call on app startup
 */
export function initSNPedia(): void {
  seed()
  console.log('[SNPedia] Module initialized')
}

/**
 * Get CSR context for a user's SNPs
 * Returns compact format ready for LLM consumption
 * 
 * @param userSnpIndex - Map of rsid -> genotype from user's DNA
 * @param relevantRsids - Optional list of rsids to focus on
 * @returns Compact SNP info for LLM (low token count)
 */
export async function getCSRForUser(
  userSnpIndex: Map<string, string | null>,
  relevantRsids?: string[]
): Promise<CompactSNPInfo[]> {
  const rsidsToCheck = relevantRsids || Array.from(userSnpIndex.keys())
  const compactInfos: CompactSNPInfo[] = []
  
  for (const rsid of rsidsToCheck) {
    const userGenotype = userSnpIndex.get(rsid)
    if (!userGenotype) continue
    
    // Try to get from cache first
    let csr = getCSR(rsid)
    
    // If not cached, try to fetch
    if (!csr) {
      const result = await fetchSNP(rsid)
      csr = result.record
    }
    
    if (csr) {
      // Extract the user's specific allele
      const allele = extractPrimaryAllele(userGenotype)
      compactInfos.push(toCompactFormat(csr, allele))
    }
  }
  
  return compactInfos
}

/**
 * Build a compact trait context for LLM
 * This is the ONLY thing AI sees about traits
 */
export function buildCompactTraitContext(
  traitName: string,
  result: string,
  confidence: string,
  snpInfos: CompactSNPInfo[],
  hints: string[]
): CompactTraitContext {
  return {
    trait: traitName,
    result,
    confidence,
    based_on: snpInfos,
    explanation_hints: hints.slice(0, 3), // Max 3 hints
  }
}

/**
 * Get enriched SNP info for a specific question context
 * Tries to find relevant CSRs based on question keywords
 */
export async function getRelevantCSRsForQuestion(
  question: string,
  userSnpIndex: Map<string, string | null>,
  maxSnps: number = 5
): Promise<CompactSNPInfo[]> {
  const lower = question.toLowerCase()
  const relevantDomains: string[] = []
  
  // Detect relevant domains from question
  if (lower.includes('ögon') || lower.includes('eye') || lower.includes('färg')) {
    relevantDomains.push('eye_color')
  }
  if (lower.includes('kaffe') || lower.includes('koffein') || lower.includes('caffeine')) {
    relevantDomains.push('caffeine_metabolism')
  }
  if (lower.includes('stress') || lower.includes('ångest') || lower.includes('anxiety')) {
    relevantDomains.push('stress_response')
  }
  if (lower.includes('folat') || lower.includes('mthfr') || lower.includes('folate')) {
    relevantDomains.push('folate_metabolism')
  }
  if (lower.includes('laktos') || lower.includes('mjölk') || lower.includes('lactose')) {
    relevantDomains.push('lactose_tolerance')
  }
  if (lower.includes('cancer')) {
    relevantDomains.push('cancer_risk')
  }
  if (lower.includes('hjärt') || lower.includes('heart') || lower.includes('kardio')) {
    relevantDomains.push('cardiovascular')
  }
  if (lower.includes('sömn') || lower.includes('dygn') || lower.includes('sleep') || lower.includes('morgon') || lower.includes('kväll')) {
    relevantDomains.push('sleep_chronotype')
  }
  
  // Query CSRs matching domains
  const userRsids = Array.from(userSnpIndex.keys())
  const queryResult = queryCSR({
    rsids: userRsids,
    phenotype_domains: relevantDomains.length > 0 ? relevantDomains : undefined,
  })
  
  // Convert to compact format
  const compactInfos: CompactSNPInfo[] = []
  for (const csr of queryResult.found.slice(0, maxSnps)) {
    const userGenotype = userSnpIndex.get(csr.rsid)
    if (userGenotype) {
      const allele = extractPrimaryAllele(userGenotype)
      compactInfos.push(toCompactFormat(csr, allele))
    }
  }
  
  return compactInfos
}

/**
 * Extract primary allele from genotype string
 * e.g., "A;G" -> "A", "AA" -> "A"
 */
function extractPrimaryAllele(genotype: string): string {
  // Handle formats: "A;G", "AG", "A/G", "AA"
  const clean = genotype.toUpperCase().replace(/[;/]/g, '')
  return clean.charAt(0)
}

/**
 * Format CSR info as a low-token string for prompt
 */
export function formatCSRForPrompt(snpInfos: CompactSNPInfo[]): string {
  if (snpInfos.length === 0) {
    return 'Ingen specifik SNP-information tillgänglig.'
  }
  
  const lines = snpInfos.map(info => 
    `${info.rsid}${info.gene ? ` (${info.gene})` : ''}: ${info.effect} [${info.confidence}]`
  )
  
  return lines.join('\n')
}
