/**
 * SnpMatcher - Primary SNP matching engine using restructured_snp.json
 * 
 * Matches user DNA (rsid + genotype) against the curated SNP database.
 * Returns matched variants with gene, category, weight, and description.
 */

export interface SnpVariant {
  key: string           // rsid + genotype (lowercase), e.g., "rs4149584gg"
  rsid: string          // SNP ID, e.g., "rs4149584"
  genotype: string      // Genotype, e.g., "G;G"
  weight: number        // Risk weight (0 = neutral, higher = more significant)
  description: string | null  // Brief description
  category: 'Good' | 'Bad' | null  // Risk category
  gene: string | null   // Associated gene
}

export interface SnpMatch extends SnpVariant {
  userGenotype: string  // The user's actual genotype
  aiExplanation?: string  // AI-generated explanation (from backend cache or new)
  aiRiskLevel?: 'low' | 'moderate' | 'elevated' | 'high'
  aiHealthImplications?: string[]
}

export interface SnpMatchResult {
  totalUserSnps: number
  matchedCount: number
  matches: SnpMatch[]
  byCategory: {
    good: SnpMatch[]
    bad: SnpMatch[]
    neutral: SnpMatch[]
  }
  byGene: Map<string, SnpMatch[]>
  significantFindings: SnpMatch[]  // weight > 0 or category = Bad
}

// In-memory cache of loaded SNP data
let snpDatabase: Map<string, SnpVariant> | null = null
let snpByRsid: Map<string, SnpVariant[]> | null = null

/**
 * Load the SNP database from restructured_snp.json
 */
export async function loadSnpDatabase(): Promise<void> {
  if (snpDatabase) return // Already loaded

  try {
    const response = await fetch('/data/restructured_snp.json', { cache: 'no-store' })
    if (!response.ok) {
      throw new Error(`Failed to load SNP database: ${response.status}`)
    }
    
    const data = await response.json()
    const variants: SnpVariant[] = data.variants || []
    
    // Build lookup maps
    snpDatabase = new Map()
    snpByRsid = new Map()
    
    for (const variant of variants) {
      // Primary key: rsid + normalized genotype
      snpDatabase.set(variant.key, variant)
      
      // Secondary index by rsid only (for partial matching)
      const existing = snpByRsid.get(variant.rsid) || []
      existing.push(variant)
      snpByRsid.set(variant.rsid, existing)
    }
    
    console.log(`[SnpMatcher] Loaded ${snpDatabase.size} SNP variants from database`)
  } catch (error) {
    console.error('[SnpMatcher] Failed to load SNP database:', error)
    throw error
  }
}

/**
 * Normalize genotype for matching
 * Converts "AG" to "A;G", handles order variations
 */
function normalizeGenotype(genotype: string): string {
  if (!genotype) return ''
  
  // Remove any existing separators and uppercase
  const clean = genotype.replace(/[;\/\-]/g, '').toUpperCase()
  
  // Sort alleles for consistent matching (A;G == G;A)
  const alleles = clean.split('').sort()
  return alleles.join(';')
}

/**
 * Create lookup key from rsid and genotype
 */
function createLookupKey(rsid: string, genotype: string): string {
  const normalizedGenotype = normalizeGenotype(genotype).replace(/;/g, '').toLowerCase()
  return `${rsid.toLowerCase()}${normalizedGenotype}`
}

/**
 * Match user SNPs against the database
 * @param userSnps Map of rsid -> genotype from user's DNA file
 */
export async function matchUserSnps(
  userSnps: Map<string, string | null>
): Promise<SnpMatchResult> {
  await loadSnpDatabase()
  
  if (!snpDatabase || !snpByRsid) {
    throw new Error('SNP database not loaded')
  }
  
  const matches: SnpMatch[] = []
  const byCategory = {
    good: [] as SnpMatch[],
    bad: [] as SnpMatch[],
    neutral: [] as SnpMatch[],
  }
  const byGene = new Map<string, SnpMatch[]>()
  const significantFindings: SnpMatch[] = []
  
  for (const [rsid, userGenotype] of userSnps) {
    if (!userGenotype) continue
    
    // Try exact match first (rsid + genotype)
    const lookupKey = createLookupKey(rsid, userGenotype)
    let variant = snpDatabase.get(lookupKey)
    
    // If no exact match, try reversed genotype (for heterozygous)
    if (!variant) {
      const reversed = normalizeGenotype(userGenotype).split(';').reverse().join('')
      const reversedKey = `${rsid.toLowerCase()}${reversed.toLowerCase()}`
      variant = snpDatabase.get(reversedKey)
    }
    
    if (variant) {
      const match: SnpMatch = {
        ...variant,
        userGenotype,
      }
      
      matches.push(match)
      
      // Categorize
      if (variant.category === 'Good') {
        byCategory.good.push(match)
      } else if (variant.category === 'Bad') {
        byCategory.bad.push(match)
        significantFindings.push(match)
      } else {
        byCategory.neutral.push(match)
      }
      
      // Significant if weight > 0
      if (variant.weight > 0 && variant.category !== 'Bad') {
        significantFindings.push(match)
      }
      
      // Group by gene
      if (variant.gene) {
        const geneMatches = byGene.get(variant.gene) || []
        geneMatches.push(match)
        byGene.set(variant.gene, geneMatches)
      }
    }
  }
  
  // Sort significant findings by weight (descending)
  significantFindings.sort((a, b) => b.weight - a.weight)
  
  // Sort all matches by weight then category
  matches.sort((a, b) => {
    // Bad category first
    if (a.category === 'Bad' && b.category !== 'Bad') return -1
    if (b.category === 'Bad' && a.category !== 'Bad') return 1
    // Then by weight
    return b.weight - a.weight
  })
  
  return {
    totalUserSnps: userSnps.size,
    matchedCount: matches.length,
    matches,
    byCategory,
    byGene,
    significantFindings,
  }
}

/**
 * Get all unique genes in matched results
 */
export function getMatchedGenes(result: SnpMatchResult): string[] {
  return Array.from(result.byGene.keys()).sort()
}

/**
 * Get summary statistics
 */
export function getMatchSummary(result: SnpMatchResult) {
  return {
    total: result.matchedCount,
    good: result.byCategory.good.length,
    bad: result.byCategory.bad.length,
    neutral: result.byCategory.neutral.length,
    genesAffected: result.byGene.size,
    significantCount: result.significantFindings.length,
    topRisks: result.significantFindings.slice(0, 10),
  }
}
