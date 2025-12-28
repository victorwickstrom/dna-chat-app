export interface QueryPlanSnp {
  rsid: string
  gene: string
  reason: string
  evidence: 'weak' | 'moderate' | 'strong'
  priority: number
}

export interface QueryPlanSafety {
  diagnosis: boolean
  medicalAdvice: boolean
  disclaimerLevel: 'none' | 'low' | 'medium' | 'high'
}

export interface QueryPlan {
  version: string
  intent: string
  topic: string
  snps: QueryPlanSnp[]
  includeNotes: string[]
  safety: QueryPlanSafety
}
