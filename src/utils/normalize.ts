export const normalizeGenotype = (genotype: string | null | undefined): string | null => {
  if (!genotype) return null

  const cleaned = genotype.replace('/', '').toUpperCase()
  if (!cleaned) return null

  if (cleaned.length === 2) {
    const [a, b] = cleaned.split('')
    return a <= b ? `${a}${b}` : `${b}${a}`
  }

  return cleaned
}
