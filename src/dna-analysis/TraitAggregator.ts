/**
 * TraitAggregator — Transforms raw GWAS matches into human-readable traits
 *
 * Solves:
 * - GWAS noise (hundreds of meaningless rows)
 * - Aggregates correctly to biological traits
 * - Prioritizes for humans (not biologists)
 * - Explains WHY each trait is shown
 * - 100% deterministic (no AI interpretation)
 */

import type { GeneticModel } from '../dna-data/ModelTypes';

// =============================================================================
// OUTPUT TYPES
// =============================================================================

export interface TraitMatch {
  traitKey: string;
  traitName: string;

  category: 'trait';

  matchedSnpsCount: number;
  genes: string[];

  studyCount: number;
  evidenceLevel: 'low' | 'medium' | 'high';

  totalWeight: number;

  userRelevance: 'High' | 'Medium' | 'Low';

  whyShown: string;
  description: string;
}

export interface TraitAnalysisSummary {
  totalTraits: number;
  highRelevance: number;
  mediumRelevance: number;
  domainsCovered: string[];
}

// =============================================================================
// SYNONYM MAPPING (HARDCODED)
// =============================================================================

const TRAIT_SYNONYMS: Record<string, string> = {
  cpd: 'smoking_quantity',
  'cigarettes per day': 'smoking_quantity',
  hdl: 'hdl_cholesterol',
  'hdl-c': 'hdl_cholesterol',
  'hdl cholesterol': 'hdl_cholesterol',
  sbp: 'systolic_blood_pressure',
  'systolic blood pressure': 'systolic_blood_pressure',
  dbp: 'diastolic_blood_pressure',
  'diastolic blood pressure': 'diastolic_blood_pressure',
  hba1c: 'hba1c',
  'sleep duration': 'sleep_duration',
  'age at natural menopause': 'menopause_age',
  'age at menopause': 'menopause_age',
  bmi: 'body_mass_index',
  'body mass index': 'body_mass_index',
  ldl: 'ldl_cholesterol',
  'ldl-c': 'ldl_cholesterol',
  'ldl cholesterol': 'ldl_cholesterol',
  'total cholesterol': 'total_cholesterol',
  tc: 'total_cholesterol',
  triglycerides: 'triglycerides',
  tg: 'triglycerides',
  'fasting glucose': 'fasting_glucose',
  'type 2 diabetes': 'type_2_diabetes',
  t2d: 'type_2_diabetes',
  'coronary artery disease': 'coronary_artery_disease',
  cad: 'coronary_artery_disease',
  'heart rate': 'heart_rate',
  'resting heart rate': 'heart_rate',
  'blood pressure': 'blood_pressure',
  hypertension: 'hypertension',
  height: 'height',
  weight: 'weight',
  'waist circumference': 'waist_circumference',
  'hip circumference': 'hip_circumference',
  'waist-hip ratio': 'waist_hip_ratio',
  whr: 'waist_hip_ratio',
};

// =============================================================================
// DISPLAY NAME MAPPING
// =============================================================================

const TRAIT_DISPLAY_NAMES: Record<string, string> = {
  smoking_quantity: 'Smoking quantity',
  hdl_cholesterol: 'HDL cholesterol',
  ldl_cholesterol: 'LDL cholesterol',
  total_cholesterol: 'Total cholesterol',
  systolic_blood_pressure: 'Systolic blood pressure',
  diastolic_blood_pressure: 'Diastolic blood pressure',
  hba1c: 'HbA1c (blood sugar marker)',
  sleep_duration: 'Sleep duration',
  menopause_age: 'Age at natural menopause',
  body_mass_index: 'Body mass index (BMI)',
  triglycerides: 'Triglycerides',
  fasting_glucose: 'Fasting glucose',
  type_2_diabetes: 'Type 2 diabetes risk',
  coronary_artery_disease: 'Coronary artery disease',
  heart_rate: 'Resting heart rate',
  blood_pressure: 'Blood pressure',
  hypertension: 'Hypertension',
  height: 'Height',
  weight: 'Weight',
  waist_circumference: 'Waist circumference',
  hip_circumference: 'Hip circumference',
  waist_hip_ratio: 'Waist-hip ratio',
};

// =============================================================================
// DOMAIN CLASSIFICATION (for summary)
// =============================================================================

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  cardiovascular: ['cholesterol', 'blood_pressure', 'heart', 'coronary', 'hypertension', 'triglycerides'],
  metabolism: ['glucose', 'diabetes', 'hba1c', 'insulin', 'bmi', 'body_mass', 'weight', 'obesity'],
  lipids: ['hdl', 'ldl', 'cholesterol', 'triglycerides', 'lipid'],
  anthropometric: ['height', 'weight', 'waist', 'hip', 'circumference', 'bmi'],
  sleep: ['sleep', 'insomnia', 'circadian'],
  behavior: ['smoking', 'alcohol', 'caffeine', 'coffee'],
  hormonal: ['menopause', 'testosterone', 'estrogen', 'hormone'],
};

function classifyTraitDomain(traitKey: string): string {
  const keyLower = traitKey.toLowerCase();
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    if (keywords.some((kw) => keyLower.includes(kw))) {
      return domain;
    }
  }
  return 'other';
}

// =============================================================================
// NORMALIZATION
// =============================================================================

function normalizeTraitKey(raw: string | undefined): string {
  if (!raw) return 'unknown_trait';

  let text = raw.toLowerCase();

  // Remove parentheses and their contents
  text = text.replace(/\([^)]*\)/g, '');

  // Remove "gwas association for"
  text = text.replace(/gwas association for/gi, '');

  // Remove population qualifiers
  const populationTerms = [
    'men',
    'women',
    'male',
    'female',
    'males',
    'females',
    'overall',
    'combined',
    'european',
    'asian',
    'african',
    'hispanic',
    'east asian',
    'south asian',
  ];
  for (const term of populationTerms) {
    text = text.replace(new RegExp(`\\b${term}\\b`, 'gi'), '');
  }

  // Trim and collapse whitespace
  text = text.trim().replace(/\s+/g, ' ');

  // Check synonym mapping
  if (TRAIT_SYNONYMS[text]) {
    return TRAIT_SYNONYMS[text];
  }

  // Convert to snake_case
  return text
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_');
}

// =============================================================================
// DISPLAY NAME
// =============================================================================

function getTraitDisplayName(traitKey: string): string {
  if (TRAIT_DISPLAY_NAMES[traitKey]) {
    return TRAIT_DISPLAY_NAMES[traitKey];
  }

  // Fallback: Start Case from snake_case
  return traitKey
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// =============================================================================
// EVIDENCE LEVEL HELPERS
// =============================================================================

function normalizeEvidenceLevel(level: string | undefined): 'high' | 'medium' | 'low' {
  const l = (level ?? '').toLowerCase();
  if (l === 'high' || l === '1a' || l === '1b') return 'high';
  if (l === 'medium' || l === '2a' || l === '2b') return 'medium';
  return 'low';
}

function maxEvidenceLevel(levels: ('high' | 'medium' | 'low')[]): 'high' | 'medium' | 'low' {
  if (levels.includes('high')) return 'high';
  if (levels.includes('medium')) return 'medium';
  return 'low';
}

// =============================================================================
// USER RELEVANCE CLASSIFICATION
// =============================================================================

function classifyUserRelevance(
  evidenceLevel: 'high' | 'medium' | 'low',
  studyCount: number
): 'High' | 'Medium' | 'Low' {
  if (evidenceLevel === 'high' && studyCount >= 5) return 'High';
  if (evidenceLevel === 'medium' && studyCount >= 3) return 'Medium';
  return 'Low';
}

// =============================================================================
// SORTING
// =============================================================================

const RELEVANCE_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
const EVIDENCE_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

function sortTraits(traits: TraitMatch[]): TraitMatch[] {
  return traits.sort((a, b) => {
    // 1. userRelevance (High → Medium → Low)
    const relDiff = RELEVANCE_ORDER[a.userRelevance] - RELEVANCE_ORDER[b.userRelevance];
    if (relDiff !== 0) return relDiff;

    // 2. evidenceLevel (high → low)
    const evDiff = EVIDENCE_ORDER[a.evidenceLevel] - EVIDENCE_ORDER[b.evidenceLevel];
    if (evDiff !== 0) return evDiff;

    // 3. totalWeight (desc)
    if (b.totalWeight !== a.totalWeight) return b.totalWeight - a.totalWeight;

    // 4. studyCount (desc)
    return b.studyCount - a.studyCount;
  });
}

// =============================================================================
// MAIN AGGREGATION FUNCTION
// =============================================================================

export function aggregateTraits(
  matchedModels: GeneticModel[],
  userRsids: string[]
): {
  summary: TraitAnalysisSummary;
  traits: TraitMatch[];
} {
  // Normalize user rsids for matching
  const userRsidSet = new Set(userRsids.map((r) => r.toLowerCase()));

  // STEP 1: Filter to trait models only
  const traitModels = matchedModels.filter((m) => m.domain === 'trait');

  if (traitModels.length === 0) {
    return {
      summary: {
        totalTraits: 0,
        highRelevance: 0,
        mediumRelevance: 0,
        domainsCovered: [],
      },
      traits: [],
    };
  }

  // STEP 2 & 3: Group by canonical traitKey
  const traitGroups = new Map<string, GeneticModel[]>();

  for (const model of traitModels) {
    const traitKey = normalizeTraitKey(model.phenotype ?? model.id);
    if (!traitGroups.has(traitKey)) {
      traitGroups.set(traitKey, []);
    }
    traitGroups.get(traitKey)!.push(model);
  }

  // STEP 4-8: Aggregate each trait group
  const traits: TraitMatch[] = [];

  for (const [traitKey, models] of traitGroups.entries()) {
    // 4.1: Unique matched SNPs
    const matchedSnps = new Set<string>();
    for (const model of models) {
      // Check model.rsid
      if (model.rsid && userRsidSet.has(model.rsid.toLowerCase())) {
        matchedSnps.add(model.rsid.toLowerCase());
      }
      // Check model.snps array
      if (model.snps) {
        for (const snp of model.snps) {
          if (userRsidSet.has(snp.rsid.toLowerCase())) {
            matchedSnps.add(snp.rsid.toLowerCase());
          }
        }
      }
    }

    // Skip if no actual matches
    if (matchedSnps.size === 0) continue;

    // 4.2: Unique genes
    const genes = new Set<string>();
    for (const model of models) {
      if (model.gene) genes.add(model.gene);
      // Some models have genes in snps
      if (model.snps) {
        for (const snp of model.snps) {
          const g = (snp as unknown as { gene?: string }).gene;
          if (g) genes.add(g);
        }
      }
    }

    // 4.3: Max evidence level
    const evidenceLevels = models.map((m) => normalizeEvidenceLevel(m.evidence_level));
    const evidenceLevel = maxEvidenceLevel(evidenceLevels);

    // 4.4: Total weight (sum of snps.length, fallback to models.length)
    let totalWeight = 0;
    for (const model of models) {
      totalWeight += model.snps?.length ?? 1;
    }

    // 4.5: Study count
    const studyCount = models.length;

    // STEP 5: User relevance
    const userRelevance = classifyUserRelevance(evidenceLevel, studyCount);

    // STEP 6: Display name
    const traitName = getTraitDisplayName(traitKey);

    // STEP 7: Why shown
    const whyShown = `${matchedSnps.size} of your genetic variants have been linked to this trait across ${studyCount} ${studyCount === 1 ? 'study' : 'studies'}.`;

    // STEP 8: Safe description
    const description =
      'This trait has been studied in genetic research and is included here for informational purposes.';

    traits.push({
      traitKey,
      traitName,
      category: 'trait',
      matchedSnpsCount: matchedSnps.size,
      genes: Array.from(genes),
      studyCount,
      evidenceLevel,
      totalWeight,
      userRelevance,
      whyShown,
      description,
    });
  }

  // STEP 9: Sort
  const sortedTraits = sortTraits(traits);

  // STEP 10: Build summary
  const domainsCovered = new Set<string>();
  for (const trait of sortedTraits) {
    domainsCovered.add(classifyTraitDomain(trait.traitKey));
  }

  const summary: TraitAnalysisSummary = {
    totalTraits: sortedTraits.length,
    highRelevance: sortedTraits.filter((t) => t.userRelevance === 'High').length,
    mediumRelevance: sortedTraits.filter((t) => t.userRelevance === 'Medium').length,
    domainsCovered: Array.from(domainsCovered).filter((d) => d !== 'other'),
  };

  return { summary, traits: sortedTraits };
}
