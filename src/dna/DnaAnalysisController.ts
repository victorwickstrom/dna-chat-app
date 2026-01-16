/**
 * DNA Analysis Controller
 * Orchestrates genetic analysis after DNA file parsing
 * 
 * PRIMARY: Uses restructured_snp.json for SNP matching
 * SECONDARY: Falls back to GWAS models for additional context
 * AI ENRICHMENT: Sends significant matches to backend for AI explanations (cached)
 */

import { DataRegistry } from '../dna-data/DataRegistry'
import { runMatchEngine } from '../dna-data/MatchEngine'
import { aggregateTraits } from '../dna-analysis/TraitAggregator'
import { matchUserSnps, type SnpMatchResult } from '../dna-analysis/SnpMatcher'
import { generateRiskChat, checkBackendHealth, type ChatGenerationResult } from '../dna-analysis/SnpEnrichmentApi'
import { dnaState } from './dnaState'
import { populateFromSnpResult } from './UserGeneticContext'
import { TraitRegistry } from '../traits'

/**
 * Run full DNA analysis against all indexed genetic data
 * This is triggered automatically after DNA file parsing completes
 * 
 * @param rsids - Array of rsid strings from user's DNA file
 * @param snpIndex - Map of rsid -> genotype from user's DNA file
 */
export async function runDnaAnalysis(
  rsids: string[],
  snpIndex?: Map<string, string | null>
): Promise<void> {
  try {
    dnaState.status = 'analyzing'
    dnaState.rsids = rsids
    dnaState.error = undefined

    console.log('[runDnaAnalysis] Starting analysis for', rsids.length, 'rsids')

    // ==========================================================================
    // STEP 1: PRIMARY MATCHING - Use restructured_snp.json
    // ==========================================================================
    let snpMatchResult: SnpMatchResult | null = null
    
    if (snpIndex && snpIndex.size > 0) {
      console.log('[runDnaAnalysis] Running primary SNP matching against restructured_snp.json')
      snpMatchResult = await matchUserSnps(snpIndex)
      
      console.log('[runDnaAnalysis] Primary SNP match complete:', {
        matched: snpMatchResult.matchedCount,
        good: snpMatchResult.byCategory.good.length,
        bad: snpMatchResult.byCategory.bad.length,
        significant: snpMatchResult.significantFindings.length,
        genes: snpMatchResult.byGene.size,
      })
      
      // Store primary match result
      dnaState.snpMatchResult = snpMatchResult
      
      // Populate UserGeneticContext for persistent memory
      populateFromSnpResult(rsids, snpMatchResult, dnaState.enrichedSnps)
    }

    // ==========================================================================
    // STEP 2: EVALUATE TRAITS - Deterministic trait evaluation
    // ==========================================================================
    if (snpIndex && snpIndex.size > 0) {
      const dnaHash = `${rsids.length}-${rsids[0] || ''}`
      const traitResults = TraitRegistry.evaluateAll(snpIndex, dnaHash)
      
      console.log('[runDnaAnalysis] Trait evaluation complete:', {
        total: traitResults.length,
        evaluable: traitResults.filter(r => r.can_evaluate).length,
        withClassification: traitResults.filter(r => r.classification).length,
      })
    }

    // ==========================================================================
    // STEP 3: GENERATE CHAT EXPLANATION - Send risk SNPs to backend
    // ==========================================================================
    let chatResult: ChatGenerationResult | null = null
    
    if (snpMatchResult && snpMatchResult.byCategory.bad.length > 0) {
      const backendAvailable = await checkBackendHealth()
      
      if (backendAvailable) {
        console.log('[runDnaAnalysis] Backend available, generating chat for risk SNPs')
        chatResult = await generateRiskChat(snpMatchResult.byCategory.bad)
        
        if (chatResult) {
          console.log('[runDnaAnalysis] Chat generation complete:', chatResult.stats)
          dnaState.riskChatMessage = chatResult.chatMessage
          dnaState.snpDetails = chatResult.snpDetails || []
        }
      } else {
        console.warn('[runDnaAnalysis] Backend not available, skipping chat generation')
      }
    }

    // ==========================================================================
    // STEP 4: Store results in state (using only primary matching)
    // ==========================================================================
    // NOTE: GWAS model requests disabled to avoid hundreds of unnecessary requests
    dnaState.analysis = null
    dnaState.matchResult = null
    dnaState.traitAnalysis = null
    dnaState.status = 'complete'

    const traitResults = TraitRegistry.getAllCachedResults()
    console.log('[runDnaAnalysis] Analysis complete', {
      primaryMatches: snpMatchResult?.matchedCount ?? 0,
      riskSnps: snpMatchResult?.byCategory.bad.length ?? 0,
      traitsEvaluated: traitResults.length,
      chatGenerated: !!chatResult,
      fromCache: chatResult?.stats.fromCache ?? 0,
    })

    // Signal completion with primary data and chat message
    window.dispatchEvent(
      new CustomEvent('dna-analysis-complete', {
        detail: { 
          snpMatchResult,
          riskChatMessage: chatResult?.chatMessage ?? null,
        },
      })
    )

  } catch (err) {
    dnaState.status = 'error'
    dnaState.error = err instanceof Error ? err.message : 'Unknown error during analysis'
    
    console.error('[DnaAnalysisController] Analysis failed:', err)

    window.dispatchEvent(
      new CustomEvent('dna-analysis-error', {
        detail: { error: dnaState.error },
      })
    )
  }
}

/**
 * Get current analysis state
 */
export function getAnalysisState() {
  return { ...dnaState }
}

/**
 * Check if analysis is complete
 */
export function isAnalysisComplete(): boolean {
  return dnaState.status === 'complete' && dnaState.analysis !== null
}
