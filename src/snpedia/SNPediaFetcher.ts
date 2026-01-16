/**
 * SNPedia Fetcher - Fetches and parses SNPedia pages into CSR format
 * 
 * IMPORTANT: This module fetches data ONCE and caches it.
 * The raw HTML is NEVER sent to the LLM.
 */

import type { CanonicalSNPRecord, AlleleEffect, ConfidenceLevel, EffectStrength, CSRFetchResult } from './CSRTypes'
import { getCSR, setCSR, hasCSR } from './CSRCache'

// =============================================================================
// Configuration
// =============================================================================

const SNPEDIA_BASE_URL = 'https://www.snpedia.com/index.php/'
const FETCH_TIMEOUT = 10000 // 10 seconds
const MAX_CONCURRENT_FETCHES = 3

// Queue for rate limiting
let fetchQueue: Promise<void> = Promise.resolve()
let activeFetches = 0

// =============================================================================
// Main Fetch Function
// =============================================================================

/**
 * Fetch a single SNP from SNPedia and convert to CSR
 * Returns cached version if available
 */
export async function fetchSNP(rsid: string): Promise<CSRFetchResult> {
  const normalized = rsid.toLowerCase()
  
  // Check cache first
  const cached = getCSR(normalized)
  if (cached) {
    return {
      success: true,
      rsid: normalized,
      record: cached,
      source: 'cache',
    }
  }
  
  // Rate limit
  while (activeFetches >= MAX_CONCURRENT_FETCHES) {
    await new Promise(r => setTimeout(r, 100))
  }
  
  activeFetches++
  
  try {
    // Use server proxy for SNPedia (handles CORS and caching)
    const proxyUrl = `http://localhost:3001/api/snpedia/${normalized}`
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
    
    try {
      const response = await fetch(proxyUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      })
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`)
      }
      
      const serverData = await response.json()
      
      // Convert server response to CSR format
      const record = convertServerResponseToCSR(normalized, serverData)
      
      // Cache locally
      setCSR(record)
      
      console.log(`[SNPedia] Fetched and cached ${normalized} from server`)
      
      return {
        success: true,
        rsid: normalized,
        record,
        source: 'fetched',
      }
    } catch (fetchError) {
      // If server fetch fails, create a placeholder record
      console.warn(`[SNPedia] Server fetch failed for ${normalized}:`, fetchError)
      
      const placeholder = createPlaceholderCSR(normalized)
      setCSR(placeholder)
      
      return {
        success: true,
        rsid: normalized,
        record: placeholder,
        source: 'fetched',
      }
    }
  } catch (error) {
    console.error(`[SNPedia] Failed to fetch ${normalized}:`, error)
    
    return {
      success: false,
      rsid: normalized,
      record: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      source: 'error',
    }
  } finally {
    activeFetches--
  }
}

/**
 * Fetch multiple SNPs with rate limiting
 */
export async function fetchSNPBatch(rsids: string[]): Promise<CSRFetchResult[]> {
  const results: CSRFetchResult[] = []
  
  // Process in batches
  for (let i = 0; i < rsids.length; i += MAX_CONCURRENT_FETCHES) {
    const batch = rsids.slice(i, i + MAX_CONCURRENT_FETCHES)
    const batchResults = await Promise.all(batch.map(fetchSNP))
    results.push(...batchResults)
  }
  
  return results
}

// =============================================================================
// HTML Parsing
// =============================================================================

/**
 * Parse SNPedia HTML page into CSR format
 * Extracts only the relevant structured data
 */
function parseSnpediaHTML(rsid: string, html: string): CanonicalSNPRecord {
  // Create a DOM parser
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  
  // Extract gene name
  const gene = extractGene(doc, html)
  
  // Extract summary/description
  const functionalRole = extractSummary(doc, html)
  
  // Extract allele effects
  const effects = extractAlleleEffects(doc, html, rsid)
  
  // Extract phenotype domain
  const phenotypeDomain = inferPhenotypeDomain(html, effects)
  
  // Extract confidence
  const confidence = inferConfidence(html, effects)
  
  // Extract notes
  const notes = extractNotes(doc, html)
  
  return {
    rsid,
    gene,
    functional_role: functionalRole,
    effects,
    phenotype_domain: phenotypeDomain,
    confidence,
    notes,
    source: 'SNPedia',
    version: new Date().toISOString().split('T')[0],
    fetched_at: Date.now(),
  }
}

function extractGene(doc: Document, html: string): string | null {
  // Try to find gene in infobox or content
  const geneMatch = html.match(/gene[=:]?\s*([A-Z0-9]+)/i)
  if (geneMatch) return geneMatch[1].toUpperCase()
  
  // Try to find in title or headers
  const h1 = doc.querySelector('h1')
  if (h1) {
    const match = h1.textContent?.match(/\(([A-Z0-9]+)\)/)
    if (match) return match[1]
  }
  
  return null
}

function extractSummary(doc: Document, html: string): string {
  // Try to get first paragraph of content
  const content = doc.querySelector('#mw-content-text p')
  if (content?.textContent) {
    // Clean and truncate
    const text = content.textContent.trim()
    if (text.length > 200) {
      return text.substring(0, 197) + '...'
    }
    return text
  }
  
  // Fallback: extract from meta description or first text
  const metaDesc = doc.querySelector('meta[name="description"]')
  if (metaDesc) {
    return metaDesc.getAttribute('content') || 'No description available'
  }
  
  return 'No description available'
}

function extractAlleleEffects(doc: Document, html: string, rsid: string): Record<string, AlleleEffect> {
  const effects: Record<string, AlleleEffect> = {}
  
  // Look for genotype tables or lists
  // Common patterns: (A;A), (A;G), (G;G)
  const genotypePattern = /\(([ACGT]);([ACGT])\)[^\n]*?(?:is|means|associated|linked|risk)?[^\n]*?([^\n]{10,100})/gi
  let match
  
  while ((match = genotypePattern.exec(html)) !== null) {
    const allele1 = match[1].toUpperCase()
    const allele2 = match[2].toUpperCase()
    const description = match[3].trim()
    
    // Add effect for first allele if not exists
    if (!effects[allele1]) {
      effects[allele1] = {
        effect: description.substring(0, 100),
        associated_traits: [],
        strength: inferStrength(description),
        risk_direction: inferRiskDirection(description),
      }
    }
    
    // Add effect for second allele if different and not exists
    if (allele1 !== allele2 && !effects[allele2]) {
      effects[allele2] = {
        effect: description.substring(0, 100),
        associated_traits: [],
        strength: inferStrength(description),
        risk_direction: inferRiskDirection(description),
      }
    }
  }
  
  // If no effects found, create placeholder
  if (Object.keys(effects).length === 0) {
    effects['A'] = { effect: 'Effect not documented', associated_traits: [], strength: 'unknown' }
    effects['G'] = { effect: 'Effect not documented', associated_traits: [], strength: 'unknown' }
  }
  
  return effects
}

function extractNotes(doc: Document, html: string): string[] {
  const notes: string[] = []
  
  // Extract key facts (limit to 3, max 100 chars each)
  const bullets = doc.querySelectorAll('#mw-content-text li')
  for (let i = 0; i < Math.min(bullets.length, 3); i++) {
    const text = bullets[i].textContent?.trim()
    if (text && text.length > 10 && text.length < 150) {
      notes.push(text.substring(0, 100))
    }
  }
  
  return notes
}

function inferPhenotypeDomain(html: string, effects: Record<string, AlleleEffect>): string {
  const lower = html.toLowerCase()
  
  if (lower.includes('eye color') || lower.includes('ögonfärg')) return 'eye_color'
  if (lower.includes('hair') || lower.includes('hår')) return 'hair_color'
  if (lower.includes('caffeine') || lower.includes('koffein')) return 'caffeine_metabolism'
  if (lower.includes('alcohol') || lower.includes('alkohol')) return 'alcohol_metabolism'
  if (lower.includes('lactose') || lower.includes('laktos')) return 'lactose_tolerance'
  if (lower.includes('folate') || lower.includes('folat') || lower.includes('mthfr')) return 'folate_metabolism'
  if (lower.includes('cancer')) return 'cancer_risk'
  if (lower.includes('heart') || lower.includes('cardio') || lower.includes('hjärt')) return 'cardiovascular'
  if (lower.includes('diabetes')) return 'diabetes_risk'
  if (lower.includes('alzheimer')) return 'alzheimers_risk'
  if (lower.includes('stress') || lower.includes('comt')) return 'stress_response'
  if (lower.includes('sleep') || lower.includes('circadian') || lower.includes('sömn')) return 'sleep_chronotype'
  if (lower.includes('drug') || lower.includes('medicine') || lower.includes('läkemedel')) return 'drug_response'
  
  return 'other'
}

function inferConfidence(html: string, effects: Record<string, AlleleEffect>): ConfidenceLevel {
  const lower = html.toLowerCase()
  
  if (lower.includes('strong evidence') || lower.includes('well-established')) return 'high'
  if (lower.includes('moderate evidence') || lower.includes('some evidence')) return 'medium'
  if (lower.includes('preliminary') || lower.includes('limited')) return 'low'
  
  // Default based on effect count
  const effectCount = Object.values(effects).filter(e => e.strength !== 'unknown').length
  if (effectCount >= 2) return 'medium'
  
  return 'uncertain'
}

function inferStrength(description: string): EffectStrength {
  const lower = description.toLowerCase()
  
  if (lower.includes('strong') || lower.includes('significant') || lower.includes('major')) return 'strong'
  if (lower.includes('moderate') || lower.includes('some') || lower.includes('modest')) return 'moderate'
  if (lower.includes('weak') || lower.includes('slight') || lower.includes('minor')) return 'weak'
  
  return 'unknown'
}

function inferRiskDirection(description: string): 'increased' | 'decreased' | 'neutral' {
  const lower = description.toLowerCase()
  
  if (lower.includes('increased') || lower.includes('higher') || lower.includes('risk') || lower.includes('elevated')) {
    return 'increased'
  }
  if (lower.includes('decreased') || lower.includes('lower') || lower.includes('protective') || lower.includes('reduced')) {
    return 'decreased'
  }
  
  return 'neutral'
}

// =============================================================================
// Server Response Conversion
// =============================================================================

interface ServerSnpediaResponse {
  rsid: string
  gene: string | null
  chromosome: string | null
  summary: string
  genotypes: Record<string, { description: string }>
  magnitude: number | null
  fetched_at: string
}

/**
 * Convert server SNPedia response to CSR format
 */
function convertServerResponseToCSR(rsid: string, data: ServerSnpediaResponse): CanonicalSNPRecord {
  const effects: Record<string, AlleleEffect> = {}
  
  // Convert genotypes to effects
  if (data.genotypes && typeof data.genotypes === 'object') {
    for (const [genotype, info] of Object.entries(data.genotypes)) {
      const alleles = genotype.split(';')
      for (const allele of alleles) {
        if (allele && !effects[allele]) {
          effects[allele] = {
            effect: info.description || 'Effect documented',
            associated_traits: [],
            strength: data.magnitude && data.magnitude >= 3 ? 'strong' : 
                      data.magnitude && data.magnitude >= 2 ? 'moderate' : 'weak',
            risk_direction: inferRiskDirection(info.description || ''),
          }
        }
      }
    }
  }
  
  // If no genotypes found, add placeholder alleles
  if (Object.keys(effects).length === 0) {
    effects['A'] = { effect: data.summary || 'Unknown', associated_traits: [], strength: 'unknown' }
    effects['G'] = { effect: data.summary || 'Unknown', associated_traits: [], strength: 'unknown' }
  }
  
  return {
    rsid: data.rsid || rsid,
    gene: data.gene,
    functional_role: data.summary || 'SNP data from SNPedia',
    effects,
    phenotype_domain: inferPhenotypeDomainFromSummary(data.summary || ''),
    confidence: data.magnitude && data.magnitude >= 3 ? 'high' : 
                data.magnitude && data.magnitude >= 2 ? 'medium' : 'low',
    notes: data.summary ? [data.summary.substring(0, 100)] : [],
    source: 'SNPedia',
    version: data.fetched_at?.split('T')[0] || new Date().toISOString().split('T')[0],
    fetched_at: Date.now(),
  }
}

function inferPhenotypeDomainFromSummary(summary: string): string {
  const lower = summary.toLowerCase()
  if (lower.includes('eye') || lower.includes('ögon')) return 'eye_color'
  if (lower.includes('hair') || lower.includes('hår')) return 'hair_color'
  if (lower.includes('caffeine') || lower.includes('koffein')) return 'caffeine_metabolism'
  if (lower.includes('alcohol') || lower.includes('alkohol')) return 'alcohol_metabolism'
  if (lower.includes('lactose') || lower.includes('laktos')) return 'lactose_tolerance'
  if (lower.includes('cancer')) return 'cancer_risk'
  if (lower.includes('heart') || lower.includes('cardio')) return 'cardiovascular'
  if (lower.includes('diabetes')) return 'diabetes_risk'
  if (lower.includes('alzheimer')) return 'alzheimers_risk'
  return 'other'
}

// =============================================================================
// Placeholder/Fallback
// =============================================================================

/**
 * Create a placeholder CSR when SNPedia fetch fails
 */
function createPlaceholderCSR(rsid: string): CanonicalSNPRecord {
  return {
    rsid,
    gene: null,
    functional_role: 'SNP data pending - could not fetch from SNPedia',
    effects: {
      'A': { effect: 'Unknown', associated_traits: [], strength: 'unknown' },
      'G': { effect: 'Unknown', associated_traits: [], strength: 'unknown' },
      'C': { effect: 'Unknown', associated_traits: [], strength: 'unknown' },
      'T': { effect: 'Unknown', associated_traits: [], strength: 'unknown' },
    },
    phenotype_domain: 'other',
    confidence: 'uncertain',
    notes: ['Data not yet available from SNPedia'],
    source: 'SNPedia',
    version: new Date().toISOString().split('T')[0],
    fetched_at: Date.now(),
  }
}

// =============================================================================
// Pre-seeded Common SNPs
// =============================================================================

/**
 * Pre-seed cache with commonly used SNPs
 * This avoids network requests for the most common queries
 */
export function seedCommonSNPs(): void {
  const commonSNPs: CanonicalSNPRecord[] = [
    {
      rsid: 'rs12913832',
      gene: 'HERC2',
      functional_role: 'Regulates OCA2 expression, primary determinant of eye color',
      effects: {
        'G': { effect: 'Low melanin, associated with blue/green eyes', associated_traits: ['blue_eyes', 'green_eyes'], strength: 'strong' },
        'A': { effect: 'High melanin, associated with brown eyes', associated_traits: ['brown_eyes'], strength: 'strong' },
      },
      phenotype_domain: 'eye_color',
      confidence: 'high',
      notes: ['Primary eye color determinant in Europeans', 'Does not fully explain green/hazel alone'],
      source: 'SNPedia',
      version: '2025-01-01',
      fetched_at: Date.now(),
    },
    {
      rsid: 'rs4680',
      gene: 'COMT',
      functional_role: 'Affects dopamine degradation rate in prefrontal cortex',
      effects: {
        'G': { effect: 'Fast dopamine breakdown (Warrior)', associated_traits: ['stress_resilience', 'lower_anxiety'], strength: 'strong' },
        'A': { effect: 'Slow dopamine breakdown (Worrier)', associated_traits: ['better_memory', 'higher_anxiety'], strength: 'strong' },
      },
      phenotype_domain: 'stress_response',
      confidence: 'high',
      notes: ['Val158Met polymorphism', 'Affects cognitive performance under stress'],
      source: 'SNPedia',
      version: '2025-01-01',
      fetched_at: Date.now(),
    },
    {
      rsid: 'rs1801133',
      gene: 'MTHFR',
      functional_role: 'Affects folate metabolism efficiency',
      effects: {
        'C': { effect: 'Normal enzyme activity', associated_traits: ['normal_folate'], strength: 'strong' },
        'T': { effect: 'Reduced enzyme activity (30-70%)', associated_traits: ['elevated_homocysteine'], strength: 'strong' },
      },
      phenotype_domain: 'folate_metabolism',
      confidence: 'high',
      notes: ['C677T variant', 'Common in many populations'],
      source: 'SNPedia',
      version: '2025-01-01',
      fetched_at: Date.now(),
    },
    {
      rsid: 'rs762551',
      gene: 'CYP1A2',
      functional_role: 'Main enzyme for caffeine metabolism',
      effects: {
        'A': { effect: 'Fast caffeine metabolism', associated_traits: ['high_caffeine_tolerance'], strength: 'strong' },
        'C': { effect: 'Slow caffeine metabolism', associated_traits: ['caffeine_sensitivity'], strength: 'strong' },
      },
      phenotype_domain: 'caffeine_metabolism',
      confidence: 'high',
      notes: ['Affects how quickly caffeine is cleared', 'Impacts coffee tolerance'],
      source: 'SNPedia',
      version: '2025-01-01',
      fetched_at: Date.now(),
    },
    {
      rsid: 'rs4988235',
      gene: 'MCM6',
      functional_role: 'Controls lactase persistence in adults',
      effects: {
        'A': { effect: 'Lactase persistence (lactose tolerant)', associated_traits: ['lactose_tolerance'], strength: 'strong' },
        'G': { effect: 'Lactase non-persistence (lactose intolerant)', associated_traits: ['lactose_intolerance'], strength: 'strong' },
      },
      phenotype_domain: 'lactose_tolerance',
      confidence: 'high',
      notes: ['European lactose tolerance variant', 'Other variants exist in other populations'],
      source: 'SNPedia',
      version: '2025-01-01',
      fetched_at: Date.now(),
    },
    {
      rsid: 'rs12821256',
      gene: 'KITLG',
      functional_role: 'Affects hair color, particularly blonde vs brown hair',
      effects: {
        'C': { effect: '2x more likely to have blonde hair', associated_traits: ['blonde_hair'], strength: 'strong' },
        'T': { effect: 'Normal, typically brown/dark hair', associated_traits: ['brown_hair', 'dark_hair'], strength: 'strong' },
      },
      phenotype_domain: 'hair_color',
      confidence: 'high',
      notes: ['Study in Icelanders and Dutch (PMID 17952075)', 'Odds ratio 2.32 per C allele for blonde hair', 'NOT associated with red hair'],
      source: 'SNPedia',
      version: '2025-01-01',
      fetched_at: Date.now(),
    },
    {
      rsid: 'rs1805007',
      gene: 'MC1R',
      functional_role: 'Major gene for red hair and fair skin',
      effects: {
        'T': { effect: 'Associated with red hair and fair skin', associated_traits: ['red_hair', 'fair_skin', 'freckling'], strength: 'strong' },
        'C': { effect: 'Normal pigmentation', associated_traits: ['normal_pigmentation'], strength: 'strong' },
      },
      phenotype_domain: 'hair_color',
      confidence: 'high',
      notes: ['R151C variant', 'One of several MC1R variants for red hair', 'Also increases sun sensitivity'],
      source: 'SNPedia',
      version: '2025-01-01',
      fetched_at: Date.now(),
    },
    {
      rsid: 'rs1805008',
      gene: 'MC1R',
      functional_role: 'Major gene for red hair and fair skin',
      effects: {
        'T': { effect: 'Associated with red hair and fair skin', associated_traits: ['red_hair', 'fair_skin'], strength: 'strong' },
        'C': { effect: 'Normal pigmentation', associated_traits: ['normal_pigmentation'], strength: 'strong' },
      },
      phenotype_domain: 'hair_color',
      confidence: 'high',
      notes: ['R160W variant', 'Strong red hair association', 'Common in Northern Europeans'],
      source: 'SNPedia',
      version: '2025-01-01',
      fetched_at: Date.now(),
    },
  ]
  
  for (const snp of commonSNPs) {
    if (!hasCSR(snp.rsid)) {
      setCSR(snp)
    }
  }
  
  console.log(`[SNPedia] Seeded ${commonSNPs.length} common SNPs`)
}
