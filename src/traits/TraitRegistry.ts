/**
 * TraitRegistry - Storage and management of trait definitions
 * 
 * Handles:
 * - Loading built-in traits
 * - Storing user-created traits
 * - Persisting to localStorage
 * - Trait lookup and matching
 */

import type { TraitDefinition, TraitEvaluationResult } from './TraitTypes'
import { ALL_TRAITS, TRAIT_MAP } from './TraitDefinitions'
import { evaluateTrait, evaluateAllTraits, validateTraitDefinition } from './TraitEngine'

// =============================================================================
// Storage
// =============================================================================

const STORAGE_KEY = 'dna_trait_registry'

interface StoredRegistry {
  custom_traits: TraitDefinition[]
  evaluation_cache: Record<string, TraitEvaluationResult>
  last_evaluated: number | null
  version: string
}

// =============================================================================
// Registry State
// =============================================================================

class TraitRegistryClass {
  private builtInTraits: Map<string, TraitDefinition> = new Map(TRAIT_MAP)
  private customTraits: Map<string, TraitDefinition> = new Map()
  private evaluationCache: Map<string, TraitEvaluationResult> = new Map()
  private lastEvaluated: number | null = null
  private currentDnaHash: string | null = null
  
  constructor() {
    this.loadFromStorage()
  }
  
  // ===========================================================================
  // Persistence
  // ===========================================================================
  
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored) as StoredRegistry
        for (const trait of data.custom_traits || []) {
          this.customTraits.set(trait.id, trait)
        }
        this.lastEvaluated = data.last_evaluated
        console.log('[TraitRegistry] Loaded from storage:', {
          customTraits: this.customTraits.size,
          lastEvaluated: this.lastEvaluated,
        })
      }
    } catch (e) {
      console.warn('[TraitRegistry] Failed to load from storage:', e)
    }
  }
  
  private saveToStorage(): void {
    try {
      const data: StoredRegistry = {
        custom_traits: Array.from(this.customTraits.values()),
        evaluation_cache: Object.fromEntries(this.evaluationCache),
        last_evaluated: this.lastEvaluated,
        version: '1.0',
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (e) {
      console.warn('[TraitRegistry] Failed to save to storage:', e)
    }
  }
  
  // ===========================================================================
  // Trait Access
  // ===========================================================================
  
  getAllTraits(): TraitDefinition[] {
    return [
      ...Array.from(this.builtInTraits.values()),
      ...Array.from(this.customTraits.values()),
    ]
  }
  
  getBuiltInTraits(): TraitDefinition[] {
    return Array.from(this.builtInTraits.values())
  }
  
  getCustomTraits(): TraitDefinition[] {
    return Array.from(this.customTraits.values())
  }
  
  getTrait(id: string): TraitDefinition | undefined {
    return this.builtInTraits.get(id) || this.customTraits.get(id)
  }
  
  hasTrait(id: string): boolean {
    return this.builtInTraits.has(id) || this.customTraits.has(id)
  }
  
  // ===========================================================================
  // Trait Management
  // ===========================================================================
  
  addCustomTrait(trait: TraitDefinition): { success: boolean; errors: string[] } {
    const errors = validateTraitDefinition(trait)
    if (errors.length > 0) {
      return { success: false, errors }
    }
    
    // Don't allow overwriting built-in traits
    if (this.builtInTraits.has(trait.id)) {
      return { success: false, errors: ['Cannot overwrite built-in trait'] }
    }
    
    this.customTraits.set(trait.id, trait)
    this.saveToStorage()
    
    console.log('[TraitRegistry] Added custom trait:', trait.id)
    return { success: true, errors: [] }
  }
  
  removeCustomTrait(id: string): boolean {
    if (this.customTraits.has(id)) {
      this.customTraits.delete(id)
      this.evaluationCache.delete(id)
      this.saveToStorage()
      return true
    }
    return false
  }
  
  // ===========================================================================
  // Evaluation
  // ===========================================================================
  
  evaluateAll(userSnpIndex: Map<string, string | null>, dnaHash?: string): TraitEvaluationResult[] {
    // Check if we need to re-evaluate (DNA changed)
    if (dnaHash && dnaHash === this.currentDnaHash && this.evaluationCache.size > 0) {
      console.log('[TraitRegistry] Returning cached evaluations')
      return Array.from(this.evaluationCache.values())
    }
    
    this.currentDnaHash = dnaHash || null
    const traits = this.getAllTraits()
    const results = evaluateAllTraits(traits, userSnpIndex)
    
    // Cache results
    this.evaluationCache.clear()
    for (const result of results) {
      this.evaluationCache.set(result.trait_id, result)
    }
    this.lastEvaluated = Date.now()
    this.saveToStorage()
    
    console.log('[TraitRegistry] Evaluated all traits:', {
      total: results.length,
      evaluable: results.filter(r => r.can_evaluate).length,
      withClassification: results.filter(r => r.classification).length,
    })
    
    return results
  }
  
  evaluateSingle(traitId: string, userSnpIndex: Map<string, string | null>): TraitEvaluationResult | null {
    const trait = this.getTrait(traitId)
    if (!trait) return null
    
    const result = evaluateTrait(trait, userSnpIndex)
    this.evaluationCache.set(traitId, result)
    return result
  }
  
  getCachedResult(traitId: string): TraitEvaluationResult | undefined {
    return this.evaluationCache.get(traitId)
  }
  
  getAllCachedResults(): TraitEvaluationResult[] {
    return Array.from(this.evaluationCache.values())
  }
  
  // ===========================================================================
  // Search & Matching
  // ===========================================================================
  
  findTraitsByCategory(category: string): TraitDefinition[] {
    return this.getAllTraits().filter(t => t.category === category)
  }
  
  findTraitsByKeyword(keyword: string): TraitDefinition[] {
    const lowerKeyword = keyword.toLowerCase()
    return this.getAllTraits().filter(t => 
      t.title.toLowerCase().includes(lowerKeyword) ||
      t.description.toLowerCase().includes(lowerKeyword) ||
      t.id.toLowerCase().includes(lowerKeyword)
    )
  }
  
  findTraitsBySnp(rsid: string): TraitDefinition[] {
    return this.getAllTraits().filter(t =>
      t.snps.some(s => s.rsid === rsid)
    )
  }
  
  // ===========================================================================
  // Question Matching
  // ===========================================================================
  
  /**
   * Find traits relevant to a user's question
   * Returns traits sorted by relevance
   */
  findRelevantTraits(question: string): TraitDefinition[] {
    const keywords = this.extractKeywords(question)
    const scored: { trait: TraitDefinition; score: number }[] = []
    
    for (const trait of this.getAllTraits()) {
      let score = 0
      
      // Check title and description
      for (const kw of keywords) {
        if (trait.title.toLowerCase().includes(kw)) score += 3
        if (trait.description.toLowerCase().includes(kw)) score += 2
        if (trait.id.toLowerCase().includes(kw)) score += 1
        
        // Check SNP genes
        for (const snp of trait.snps) {
          if (snp.gene.toLowerCase().includes(kw)) score += 2
        }
      }
      
      if (score > 0) {
        scored.push({ trait, score })
      }
    }
    
    return scored
      .sort((a, b) => b.score - a.score)
      .map(s => s.trait)
  }
  
  private extractKeywords(text: string): string[] {
    // Domain-specific keyword mapping
    const keywordMap: Record<string, string[]> = {
      'morgon': ['comt', 'chronotype', 'sleep', 'sömn'],
      'kväll': ['comt', 'chronotype', 'sleep', 'sömn'],
      'sömn': ['chronotype', 'sleep', 'melatonin'],
      'stress': ['comt', 'stress', 'cortisol'],
      'kaffe': ['caffeine', 'koffein', 'cyp1a2'],
      'koffein': ['caffeine', 'cyp1a2'],
      'folat': ['mthfr', 'folate', 'b12'],
      'b-vitamin': ['mthfr', 'folate'],
      'mjölk': ['lactose', 'laktos', 'mcm6'],
      'laktos': ['lactose', 'mcm6', 'lct'],
      'alkohol': ['aldh2', 'alcohol', 'flush'],
      'ångest': ['comt', 'bdnf', 'slc6a4', 'anxiety'],
      'depression': ['bdnf', 'slc6a4', 'comt'],
      'minne': ['bdnf', 'comt', 'memory'],
      'inlärning': ['bdnf', 'learning'],
      'medicin': ['cyp2d6', 'cyp2c19', 'pharmacogenetic'],
      'läkemedel': ['cyp2d6', 'cyp2c19', 'pharmacogenetic', 'tpmt'],
    }
    
    const words = text.toLowerCase().split(/\s+/)
    const keywords = new Set<string>()
    
    for (const word of words) {
      // Direct word
      if (word.length > 2) keywords.add(word)
      
      // Mapped keywords
      for (const [key, values] of Object.entries(keywordMap)) {
        if (word.includes(key)) {
          values.forEach(v => keywords.add(v))
        }
      }
    }
    
    return Array.from(keywords)
  }
  
  // ===========================================================================
  // Reset
  // ===========================================================================
  
  clearCache(): void {
    this.evaluationCache.clear()
    this.lastEvaluated = null
    this.currentDnaHash = null
    this.saveToStorage()
  }
  
  reset(): void {
    this.customTraits.clear()
    this.evaluationCache.clear()
    this.lastEvaluated = null
    this.currentDnaHash = null
    localStorage.removeItem(STORAGE_KEY)
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

export const TraitRegistry = new TraitRegistryClass()
