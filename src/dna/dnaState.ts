/**
 * DNA Analysis State
 * Global state for tracking DNA upload and analysis progress
 */

import type { AnalysisSummary, AnalysisResult } from '../dna-data/ModelTypes'
import type { TraitMatch, TraitAnalysisSummary } from '../dna-analysis/TraitAggregator'
import type { SnpMatchResult } from '../dna-analysis/SnpMatcher'
import type { EnrichedSnp, SnpChatExplanation } from '../dna-analysis/SnpEnrichmentApi'

export type DnaAnalysisStatus =
  | 'idle'
  | 'uploading'
  | 'parsing'
  | 'analyzing'
  | 'complete'
  | 'error'

export interface TraitAnalysisResult {
  summary: TraitAnalysisSummary
  traits: TraitMatch[]
}

export interface DnaAnalysisState {
  status: DnaAnalysisStatus
  rsids: string[]
  analysis: AnalysisSummary | null
  /** Deterministic match results (all matches, sorted by totalScore) */
  matchResult: AnalysisResult | null
  /** Aggregated trait analysis (human-readable, deduplicated) */
  traitAnalysis: TraitAnalysisResult | null
  /** PRIMARY: SNP matches from restructured_snp.json */
  snpMatchResult: SnpMatchResult | null
  /** AI-enriched SNP explanations (from backend with caching) */
  enrichedSnps: EnrichedSnp[]
  /** AI-generated chat message explaining risk SNPs */
  riskChatMessage: string | null
  /** Detailed SNP explanations from AI (individual cards) */
  snpDetails: SnpChatExplanation[]
  error?: string
}

export const dnaState: DnaAnalysisState = {
  status: 'idle',
  rsids: [],
  analysis: null,
  matchResult: null,
  traitAnalysis: null,
  snpMatchResult: null,
  enrichedSnps: [],
  riskChatMessage: null,
  snpDetails: [],
}

export function resetDnaState(): void {
  dnaState.status = 'idle'
  dnaState.rsids = []
  dnaState.analysis = null
  dnaState.matchResult = null
  dnaState.traitAnalysis = null
  dnaState.snpMatchResult = null
  dnaState.enrichedSnps = []
  dnaState.riskChatMessage = null
  dnaState.snpDetails = []
  dnaState.error = undefined
}
