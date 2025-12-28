import { normalizeGenotype } from './normalize'
import type { VendorCode } from './vendor'

export const extractGenotype = (columns: string[], vendor: VendorCode): string | null => {
  if (columns.length === 0) return null
  if (vendor === 'ancestry') {
    const genotype = columns[3] ?? columns[4] ?? ''
    return genotype.replace(/[^A-Za-z-]/g, '')
  }

  const genotype = columns[3] ?? columns[4] ?? columns[columns.length - 1]
  return genotype.trim()
}

export const parseLines = (lines: string[], vendor: VendorCode): Map<string, string | null> => {
  const index = new Map<string, string | null>()

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    if (!line || line.startsWith('#')) {
      continue
    }

    const normalizedLine = line.replace(/,/g, '\t')
    const columns = normalizedLine.split(/\s+/)
    if (columns.length < 2) {
      continue
    }

    const rsid = columns[0]
    if (!rsid.startsWith('rs')) {
      continue
    }

    const genotypeRaw = extractGenotype(columns, vendor)
    let genotype = genotypeRaw
    if (genotype === '--' || genotype === '00' || genotype === '') {
      genotype = null
    }

    const normalized = normalizeGenotype(genotype)
    index.set(rsid, normalized)
  }

  return index
}
