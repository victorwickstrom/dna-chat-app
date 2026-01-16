/**
 * CSR Cache - Persistent storage for Canonical SNP Records
 * 
 * Uses localStorage to avoid repeated SNPedia requests.
 * Records are immutable and versioned.
 */

import type { CanonicalSNPRecord, CSRCache, CSRQuery, CSRQueryResult } from './CSRTypes'
import { estimateTokens } from './CSRTypes'

const CACHE_KEY = 'dna_csr_cache'
const CACHE_VERSION = '1.0'

// =============================================================================
// Cache Management
// =============================================================================

let memoryCache: CSRCache | null = null

/**
 * Load cache from localStorage
 */
export function loadCache(): CSRCache {
  if (memoryCache) return memoryCache
  
  try {
    const stored = localStorage.getItem(CACHE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as CSRCache
      if (parsed.cache_version === CACHE_VERSION) {
        memoryCache = parsed
        return parsed
      }
    }
  } catch (e) {
    console.warn('[CSRCache] Failed to load cache:', e)
  }
  
  // Initialize empty cache
  memoryCache = {
    records: {},
    last_updated: Date.now(),
    count: 0,
    cache_version: CACHE_VERSION,
  }
  return memoryCache
}

/**
 * Save cache to localStorage
 */
export function saveCache(): void {
  if (!memoryCache) return
  
  try {
    memoryCache.last_updated = Date.now()
    memoryCache.count = Object.keys(memoryCache.records).length
    localStorage.setItem(CACHE_KEY, JSON.stringify(memoryCache))
  } catch (e) {
    console.warn('[CSRCache] Failed to save cache:', e)
  }
}

/**
 * Get a single CSR record by rsid
 */
export function getCSR(rsid: string): CanonicalSNPRecord | null {
  const cache = loadCache()
  const normalized = rsid.toLowerCase()
  return cache.records[normalized] || null
}

/**
 * Store a CSR record
 */
export function setCSR(record: CanonicalSNPRecord): void {
  const cache = loadCache()
  const normalized = record.rsid.toLowerCase()
  
  // Add token estimate if not present
  if (!record.token_estimate) {
    record.token_estimate = estimateTokens(record)
  }
  
  cache.records[normalized] = record
  saveCache()
}

/**
 * Store multiple CSR records
 */
export function setCSRBatch(records: CanonicalSNPRecord[]): void {
  const cache = loadCache()
  
  for (const record of records) {
    const normalized = record.rsid.toLowerCase()
    if (!record.token_estimate) {
      record.token_estimate = estimateTokens(record)
    }
    cache.records[normalized] = record
  }
  
  saveCache()
}

/**
 * Check if a CSR record exists
 */
export function hasCSR(rsid: string): boolean {
  const cache = loadCache()
  return rsid.toLowerCase() in cache.records
}

/**
 * Query multiple CSR records
 */
export function queryCSR(query: CSRQuery): CSRQueryResult {
  const cache = loadCache()
  const found: CanonicalSNPRecord[] = []
  const missing: string[] = []
  let totalTokens = 0
  
  for (const rsid of query.rsids) {
    const normalized = rsid.toLowerCase()
    const record = cache.records[normalized]
    
    if (record) {
      // Apply filters
      if (query.phenotype_domains && !query.phenotype_domains.includes(record.phenotype_domain)) {
        continue
      }
      
      if (query.min_confidence) {
        const levels = ['high', 'medium', 'low', 'uncertain']
        const minIndex = levels.indexOf(query.min_confidence)
        const recordIndex = levels.indexOf(record.confidence)
        if (recordIndex > minIndex) {
          continue
        }
      }
      
      found.push(record)
      totalTokens += record.token_estimate || estimateTokens(record)
    } else {
      missing.push(rsid)
    }
  }
  
  return { found, missing, total_tokens: totalTokens }
}

/**
 * Get all cached CSR records
 */
export function getAllCSR(): CanonicalSNPRecord[] {
  const cache = loadCache()
  return Object.values(cache.records)
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { count: number; totalTokens: number; lastUpdated: number } {
  const cache = loadCache()
  const records = Object.values(cache.records)
  const totalTokens = records.reduce((sum, r) => sum + (r.token_estimate || 0), 0)
  
  return {
    count: cache.count,
    totalTokens,
    lastUpdated: cache.last_updated,
  }
}

/**
 * Clear the entire cache
 */
export function clearCache(): void {
  memoryCache = null
  localStorage.removeItem(CACHE_KEY)
}

/**
 * Export cache as JSON (for backup/migration)
 */
export function exportCache(): string {
  const cache = loadCache()
  return JSON.stringify(cache, null, 2)
}

/**
 * Import cache from JSON
 */
export function importCache(json: string): boolean {
  try {
    const imported = JSON.parse(json) as CSRCache
    if (imported.cache_version && imported.records) {
      memoryCache = imported
      saveCache()
      return true
    }
  } catch (e) {
    console.error('[CSRCache] Failed to import cache:', e)
  }
  return false
}
