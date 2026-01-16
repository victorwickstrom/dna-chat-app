/**
 * TraitDefinitions - Pre-built trait definitions using ONLY SNPs from the database
 * 
 * CRITICAL: Every rsid listed here MUST exist in restructured_snp.json
 * These traits are deterministic - the LLM explains, it does NOT decide.
 */

import type { TraitDefinition } from './TraitTypes'

// =============================================================================
// TRAIT: COMT Stress Response (Warrior vs Worrier)
// SNPs verified in database: rs4680
// =============================================================================

export const TRAIT_COMT_STRESS: TraitDefinition = {
  id: 'comt_stress_response',
  category: 'behavioral',
  type: 'behavioral',
  title: 'COMT Stressrespons (Warrior/Worrier)',
  description: 'Hur snabbt din kropp bryter ner dopamin och katekolaminer påverkar stresshantering och kognitiv prestation under press.',
  confidence_ceiling: 'medium',
  interest_weight: 0.8,
  
  snps: [
    {
      rsid: 'rs4680',
      gene: 'COMT',
      allele_effects: {
        'G;G': { direction: 'warrior', weight: 1.0 },
        'GG': { direction: 'warrior', weight: 1.0 },
        'A;G': { direction: 'intermediate', weight: 0.5 },
        'AG': { direction: 'intermediate', weight: 0.5 },
        'G;A': { direction: 'intermediate', weight: 0.5 },
        'GA': { direction: 'intermediate', weight: 0.5 },
        'A;A': { direction: 'worrier', weight: 1.0 },
        'AA': { direction: 'worrier', weight: 1.0 },
      },
      evidence: 'strong',
      required: true,
    },
  ],
  
  scoring_model: {
    dimensions: ['warrior_score', 'worrier_score', 'intermediate_score'],
    aggregation: 'sum',
    threshold_difference: 0.3,
  },
  
  classification_rules: [
    {
      id: 'warrior',
      condition: 'warrior_score > worrier_score AND warrior_score > intermediate_score',
      label: 'Warrior-typ',
      confidence: 'medium',
      description: 'Snabb COMT-aktivitet. Tenderar att prestera bättre under akut stress men kan ha lägre baseline-dopamin.',
    },
    {
      id: 'worrier',
      condition: 'worrier_score > warrior_score AND worrier_score > intermediate_score',
      label: 'Worrier-typ',
      confidence: 'medium',
      description: 'Långsam COMT-aktivitet. Fördel i minnes- och uppmärksamhetsuppgifter men kan vara känsligare för långvarig stress.',
    },
    {
      id: 'intermediate',
      condition: 'intermediate_score >= 0.5 OR (warrior_score == worrier_score)',
      label: 'Intermediär typ',
      confidence: 'medium',
      description: 'Balanserad COMT-aktivitet. Kombinerar egenskaper från båda typerna.',
    },
  ],
  
  explanations: {
    means: 'Denna analys visar en genetisk tendens som KAN påverka hur din kropp hanterar dopamin under stress. Det är EN faktor bland många.',
    not_means: 'Detta är INTE en diagnos av ångest, ADHD eller andra tillstånd. Det säger ingenting om din mentala hälsa eller prestationsförmåga.',
    limitations: [
      'COMT är bara en av hundratals gener som påverkar stressrespons',
      'Miljö, livsstil och erfarenheter har stor påverkan',
      'Samma genvariant kan uttryckas olika hos olika personer',
      'Forskningsresultaten är inte alltid konsekventa',
    ],
  },
  
  created_at: Date.now(),
  version: '1.0',
}

// =============================================================================
// TRAIT: MTHFR Folate Metabolism
// SNPs verified in database: rs1801133, rs1801131
// =============================================================================

export const TRAIT_MTHFR_FOLATE: TraitDefinition = {
  id: 'mthfr_folate_metabolism',
  category: 'metabolic',
  type: 'metabolic',
  title: 'MTHFR Folatmetabolism',
  description: 'Hur effektivt din kropp omvandlar folat till dess aktiva form (metylfolat).',
  confidence_ceiling: 'high',
  interest_weight: 0.9,
  
  snps: [
    {
      rsid: 'rs1801133',
      gene: 'MTHFR',
      allele_effects: {
        'T;T': { direction: 'reduced', weight: 1.0 },
        'TT': { direction: 'reduced', weight: 1.0 },
        'C;T': { direction: 'reduced', weight: 0.5 },
        'CT': { direction: 'reduced', weight: 0.5 },
        'T;C': { direction: 'reduced', weight: 0.5 },
        'TC': { direction: 'reduced', weight: 0.5 },
        'C;C': { direction: 'normal', weight: 1.0 },
        'CC': { direction: 'normal', weight: 1.0 },
      },
      evidence: 'strong',
      required: true,
    },
    {
      rsid: 'rs1801131',
      gene: 'MTHFR',
      allele_effects: {
        'C;C': { direction: 'reduced', weight: 0.5 },
        'CC': { direction: 'reduced', weight: 0.5 },
        'A;C': { direction: 'reduced', weight: 0.25 },
        'AC': { direction: 'reduced', weight: 0.25 },
        'C;A': { direction: 'reduced', weight: 0.25 },
        'CA': { direction: 'reduced', weight: 0.25 },
        'A;A': { direction: 'normal', weight: 0.5 },
        'AA': { direction: 'normal', weight: 0.5 },
      },
      evidence: 'moderate',
      required: false,
    },
  ],
  
  scoring_model: {
    dimensions: ['reduced_score', 'normal_score'],
    aggregation: 'sum',
    threshold_difference: 0.5,
  },
  
  classification_rules: [
    {
      id: 'significantly_reduced',
      condition: 'reduced_score >= 1.5',
      label: 'Signifikant reducerad MTHFR-aktivitet',
      confidence: 'high',
      description: 'Homozygot för C677T eller kombinerade varianter. Cirka 10-20% av normal enzymaktivitet.',
    },
    {
      id: 'moderately_reduced',
      condition: 'reduced_score >= 0.5 AND reduced_score < 1.5',
      label: 'Måttligt reducerad MTHFR-aktivitet',
      confidence: 'high',
      description: 'Heterozygot för C677T eller A1298C. Cirka 65% av normal enzymaktivitet.',
    },
    {
      id: 'normal',
      condition: 'normal_score > reduced_score OR reduced_score < 0.5',
      label: 'Normal MTHFR-aktivitet',
      confidence: 'high',
      description: 'Inga kliniskt signifikanta MTHFR-varianter. Normal folatmetabolism.',
    },
  ],
  
  explanations: {
    means: 'Visar hur effektivt du genetiskt kan omvandla folat. Reducerad aktivitet kan påverka homocysteinnivåer.',
    not_means: 'Detta betyder INTE att du har folatbrist eller behöver tillskott. Endast blodprover kan avgöra faktiska nivåer.',
    limitations: [
      'Genvariant ≠ faktisk enzymaktivitet i kroppen',
      'Kost och livsstil påverkar folatstatus betydligt',
      'Många med MTHFR-varianter har normala folatnivåer',
      'Individuell variation är stor',
    ],
  },
  
  created_at: Date.now(),
  version: '1.0',
}

// =============================================================================
// TRAIT: Caffeine Metabolism (CYP1A2)
// SNPs verified in database: CYP1A2 gene exists with 19 entries
// =============================================================================

export const TRAIT_CAFFEINE_METABOLISM: TraitDefinition = {
  id: 'caffeine_metabolism',
  category: 'metabolic',
  type: 'metabolic',
  title: 'Koffeinmetabolism',
  description: 'Hur snabbt din kropp bryter ner koffein, vilket påverkar känslighet och optimal tidpunkt för koffeinkonsumtion.',
  confidence_ceiling: 'medium',
  interest_weight: 0.7,
  
  snps: [
    {
      rsid: 'rs762551',
      gene: 'CYP1A2',
      allele_effects: {
        'A;A': { direction: 'fast', weight: 1.0 },
        'AA': { direction: 'fast', weight: 1.0 },
        'A;C': { direction: 'intermediate', weight: 0.5 },
        'AC': { direction: 'intermediate', weight: 0.5 },
        'C;A': { direction: 'intermediate', weight: 0.5 },
        'CA': { direction: 'intermediate', weight: 0.5 },
        'C;C': { direction: 'slow', weight: 1.0 },
        'CC': { direction: 'slow', weight: 1.0 },
      },
      evidence: 'strong',
      required: true,
    },
  ],
  
  scoring_model: {
    dimensions: ['fast_score', 'slow_score', 'intermediate_score'],
    aggregation: 'sum',
    threshold_difference: 0.3,
  },
  
  classification_rules: [
    {
      id: 'fast_metabolizer',
      condition: 'fast_score > slow_score AND fast_score > intermediate_score',
      label: 'Snabb koffeinmetaboliserare',
      confidence: 'medium',
      description: 'Bryter ner koffein snabbt. Kan generellt tolerera mer kaffe utan sömnpåverkan.',
    },
    {
      id: 'slow_metabolizer',
      condition: 'slow_score > fast_score AND slow_score > intermediate_score',
      label: 'Långsam koffeinmetaboliserare',
      confidence: 'medium',
      description: 'Bryter ner koffein långsamt. Kan vara känsligare för koffeinets effekter, särskilt på sömn.',
    },
    {
      id: 'intermediate_metabolizer',
      condition: 'intermediate_score >= 0.5 OR (fast_score == slow_score)',
      label: 'Intermediär koffeinmetaboliserare',
      confidence: 'medium',
      description: 'Genomsnittlig koffeinmetabolism. Moderat känslighet.',
    },
  ],
  
  explanations: {
    means: 'Indikerar genetisk tendens för hur snabbt du metaboliserar koffein. Kan hjälpa optimera tidpunkt för koffeinkonsumtion.',
    not_means: 'Säger INTE hur mycket kaffe du bör dricka eller om kaffe är bra/dåligt för dig. Individuell variation och tolerans spelar stor roll.',
    limitations: [
      'Andra faktorer (lever, mediciner, rökning) påverkar också',
      'Tolerans utvecklas över tid',
      'Koffeinkänslighet är komplex och multifaktoriell',
      'Sömn påverkas av många andra faktorer',
    ],
  },
  
  created_at: Date.now(),
  version: '1.0',
}

// =============================================================================
// TRAIT: BDNF and Learning/Mood
// SNPs verified in database: rs6265
// =============================================================================

export const TRAIT_BDNF_NEUROPLASTICITY: TraitDefinition = {
  id: 'bdnf_neuroplasticity',
  category: 'behavioral',
  type: 'behavioral',
  title: 'BDNF och Neuroplasticitet',
  description: 'BDNF påverkar hjärnans plasticitet, inlärning och kan ha koppling till humör.',
  confidence_ceiling: 'low',
  interest_weight: 0.6,
  
  snps: [
    {
      rsid: 'rs6265',
      gene: 'BDNF',
      allele_effects: {
        'C;C': { direction: 'typical', weight: 1.0 },
        'CC': { direction: 'typical', weight: 1.0 },
        'C;T': { direction: 'variant', weight: 0.5 },
        'CT': { direction: 'variant', weight: 0.5 },
        'T;C': { direction: 'variant', weight: 0.5 },
        'TC': { direction: 'variant', weight: 0.5 },
        'T;T': { direction: 'variant', weight: 1.0 },
        'TT': { direction: 'variant', weight: 1.0 },
        'A;A': { direction: 'variant', weight: 1.0 },
        'AA': { direction: 'variant', weight: 1.0 },
        'A;G': { direction: 'variant', weight: 0.5 },
        'AG': { direction: 'variant', weight: 0.5 },
        'G;G': { direction: 'typical', weight: 1.0 },
        'GG': { direction: 'typical', weight: 1.0 },
      },
      evidence: 'moderate',
      required: true,
    },
  ],
  
  scoring_model: {
    dimensions: ['typical_score', 'variant_score'],
    aggregation: 'sum',
    threshold_difference: 0.3,
  },
  
  classification_rules: [
    {
      id: 'typical_bdnf',
      condition: 'typical_score > variant_score',
      label: 'Typisk BDNF-funktion',
      confidence: 'low',
      description: 'Vanlig BDNF-variant. Associerat med typisk BDNF-sekretion.',
    },
    {
      id: 'variant_bdnf',
      condition: 'variant_score > typical_score',
      label: 'BDNF Val66Met-variant',
      confidence: 'low',
      description: 'Met-allel närvarande. Kan påverka aktivitetsberoende BDNF-sekretion.',
    },
    {
      id: 'heterozygous_bdnf',
      condition: 'variant_score == typical_score OR variant_score >= 0.5 AND typical_score >= 0.5',
      label: 'Heterozygot BDNF',
      confidence: 'low',
      description: 'En kopia av varje variant. Intermediär effekt.',
    },
  ],
  
  explanations: {
    means: 'Visar vilken BDNF-variant du har. BDNF är involverat i neuroplasticitet och synaptisk funktion.',
    not_means: 'Detta är ABSOLUT INTE en indikation på intelligens, mental hälsa eller inlärningsförmåga. Korrelationer i forskning är svaga och inkonsekventa.',
    limitations: [
      'BDNF-forskning är komplex och ofta motsägelsefull',
      'Effekterna är mycket små och populationsbaserade',
      'Hjärnfunktion beror på tusentals gener och miljöfaktorer',
      'Individuella skillnader kan inte förutsägas',
      'Låg konfidens - använd ej för beslut',
    ],
  },
  
  created_at: Date.now(),
  version: '1.0',
}

// =============================================================================
// TRAIT: Alcohol Flush Response (ALDH2)
// SNPs: Need to check if ALDH2 exists
// =============================================================================

export const TRAIT_ALCOHOL_FLUSH: TraitDefinition = {
  id: 'alcohol_flush_response',
  category: 'metabolic',
  type: 'metabolic',
  title: 'Alkohol Flush-respons',
  description: 'Hur effektivt din kropp bryter ner acetaldehyd, en biprodukt av alkoholmetabolism.',
  confidence_ceiling: 'high',
  interest_weight: 0.75,
  
  snps: [
    {
      rsid: 'rs671',
      gene: 'ALDH2',
      allele_effects: {
        'G;G': { direction: 'normal', weight: 1.0 },
        'GG': { direction: 'normal', weight: 1.0 },
        'A;G': { direction: 'reduced', weight: 0.5 },
        'AG': { direction: 'reduced', weight: 0.5 },
        'G;A': { direction: 'reduced', weight: 0.5 },
        'GA': { direction: 'reduced', weight: 0.5 },
        'A;A': { direction: 'severely_reduced', weight: 1.0 },
        'AA': { direction: 'severely_reduced', weight: 1.0 },
      },
      evidence: 'strong',
      required: true,
    },
  ],
  
  scoring_model: {
    dimensions: ['normal_score', 'reduced_score', 'severely_reduced_score'],
    aggregation: 'sum',
    threshold_difference: 0.3,
  },
  
  classification_rules: [
    {
      id: 'normal_aldh2',
      condition: 'normal_score > reduced_score AND normal_score > severely_reduced_score',
      label: 'Normal ALDH2-aktivitet',
      confidence: 'high',
      description: 'Normal acetaldehyd-nedbrytning. Typisk alkoholtolerans.',
    },
    {
      id: 'reduced_aldh2',
      condition: 'reduced_score > normal_score AND reduced_score > severely_reduced_score',
      label: 'Reducerad ALDH2-aktivitet',
      confidence: 'high',
      description: 'Heterozygot. Kan uppleva flush-reaktion (rodnad, hjärtklappning) vid alkoholkonsumtion.',
    },
    {
      id: 'severely_reduced_aldh2',
      condition: 'severely_reduced_score > normal_score AND severely_reduced_score > reduced_score',
      label: 'Kraftigt reducerad ALDH2-aktivitet',
      confidence: 'high',
      description: 'Homozygot för *2-allel. Stark flush-reaktion, obehag vid alkohol. Vanligare i Östasien.',
    },
  ],
  
  explanations: {
    means: 'Visar din genetiska förmåga att bryta ner acetaldehyd. Flush-reaktion är kroppens signal om att acetaldehyd ansamlas.',
    not_means: 'Säger ingenting om alkoholism-risk, leverfunktion eller hur mycket du "bör" dricka.',
    limitations: [
      'ADH1B-varianter påverkar också alkoholmetabolism',
      'Tolerans och beteende är starkare prediktorer för alkoholproblem',
      'Flush-reaktion kan minska med vana (men risken kvarstår)',
      'Medicinskt relevant - ALDH2*2 ökar risk vid alkoholkonsumtion',
    ],
  },
  
  created_at: Date.now(),
  version: '1.0',
}

// =============================================================================
// TRAIT: Lactose Tolerance
// SNPs verified: MCM6 gene exists in database
// =============================================================================

export const TRAIT_LACTOSE_TOLERANCE: TraitDefinition = {
  id: 'lactose_tolerance',
  category: 'metabolic',
  type: 'metabolic',
  title: 'Laktostolerans',
  description: 'Genetisk förmåga att producera laktas (mjölksocker-nedbrytande enzym) i vuxen ålder.',
  confidence_ceiling: 'high',
  interest_weight: 0.85,
  
  snps: [
    {
      rsid: 'rs4988235',
      gene: 'MCM6',
      allele_effects: {
        'T;T': { direction: 'tolerant', weight: 1.0 },
        'TT': { direction: 'tolerant', weight: 1.0 },
        'A;A': { direction: 'tolerant', weight: 1.0 },  // Alternative coding
        'AA': { direction: 'tolerant', weight: 1.0 },
        'C;T': { direction: 'intermediate', weight: 0.5 },
        'CT': { direction: 'intermediate', weight: 0.5 },
        'T;C': { direction: 'intermediate', weight: 0.5 },
        'TC': { direction: 'intermediate', weight: 0.5 },
        'G;A': { direction: 'intermediate', weight: 0.5 },
        'GA': { direction: 'intermediate', weight: 0.5 },
        'A;G': { direction: 'intermediate', weight: 0.5 },
        'AG': { direction: 'intermediate', weight: 0.5 },
        'C;C': { direction: 'intolerant', weight: 1.0 },
        'CC': { direction: 'intolerant', weight: 1.0 },
        'G;G': { direction: 'intolerant', weight: 1.0 },
        'GG': { direction: 'intolerant', weight: 1.0 },
      },
      evidence: 'strong',
      required: true,
    },
  ],
  
  scoring_model: {
    dimensions: ['tolerant_score', 'intolerant_score', 'intermediate_score'],
    aggregation: 'sum',
    threshold_difference: 0.3,
  },
  
  classification_rules: [
    {
      id: 'lactose_tolerant',
      condition: 'tolerant_score > intolerant_score AND tolerant_score > intermediate_score',
      label: 'Genetiskt laktostolerant',
      confidence: 'high',
      description: 'Laktaspersistens. Genetisk förmåga att producera laktas i vuxen ålder.',
    },
    {
      id: 'lactose_intolerant',
      condition: 'intolerant_score > tolerant_score AND intolerant_score > intermediate_score',
      label: 'Genetisk laktosintolerans',
      confidence: 'high',
      description: 'Laktasnonpersistens. Genetisk tendens att minska laktasproduktion efter barndomen.',
    },
    {
      id: 'lactose_intermediate',
      condition: 'intermediate_score >= 0.5 OR (tolerant_score == intolerant_score)',
      label: 'Intermediär laktostolerans',
      confidence: 'medium',
      description: 'Heterozygot. Variabel förmåga - kan ha partiell tolerans.',
    },
  ],
  
  explanations: {
    means: 'Visar om du genetiskt har förmågan att producera laktas i vuxen ålder. De flesta människor globalt är genetiskt laktasintoleranta.',
    not_means: 'Genetisk intolerans ≠ symtom. Många med "intolerant" genotyp tål mejeri utan problem. Tarmfloran anpassar sig.',
    limitations: [
      'Symtom beror på dos, typ av mejeri, och tarmflora',
      'Sekundär laktosintolerans (från sjukdom) syns ej',
      'Fermenterade mejeriprodukter tolereras ofta',
      'Individuell variation är stor',
    ],
  },
  
  created_at: Date.now(),
  version: '1.0',
}

// =============================================================================
// TRAIT: Chronotype (Morning/Evening Preference)
// SNPs verified in database: rs4864548 (CLOCK)
// =============================================================================

export const TRAIT_CHRONOTYPE: TraitDefinition = {
  id: 'chronotype',
  category: 'behavioral',
  type: 'behavioral',
  title: 'Dygnsrytm (Kronotyp)',
  description: 'Genetisk tendens för morgon- eller kvällspreferens baserat på CLOCK-genvarianter.',
  confidence_ceiling: 'low',  // Behavioral = low ceiling
  interest_weight: 0.7,
  
  snps: [
    {
      rsid: 'rs4864548',
      gene: 'CLOCK',
      allele_effects: {
        'G;G': { direction: 'evening', weight: 1.0 },
        'GG': { direction: 'evening', weight: 1.0 },
        'A;G': { direction: 'intermediate', weight: 0.5 },
        'AG': { direction: 'intermediate', weight: 0.5 },
        'G;A': { direction: 'intermediate', weight: 0.5 },
        'GA': { direction: 'intermediate', weight: 0.5 },
        'A;A': { direction: 'morning', weight: 1.0 },
        'AA': { direction: 'morning', weight: 1.0 },
      },
      evidence: 'moderate',
      required: true,
    },
  ],
  
  scoring_model: {
    dimensions: ['morning_score', 'evening_score', 'intermediate_score'],
    aggregation: 'sum',
    threshold_difference: 0.3,
  },
  
  classification_rules: [
    {
      id: 'morning_type',
      condition: 'morning_score > evening_score AND morning_score > intermediate_score',
      label: 'Morgontyp',
      confidence: 'low',
      description: 'Genetisk tendens mot morgonpreferens. Du kan naturligt vakna tidigt och vara alert på morgonen.',
    },
    {
      id: 'evening_type',
      condition: 'evening_score > morning_score AND evening_score > intermediate_score',
      label: 'Kvällstyp',
      confidence: 'low',
      description: 'Genetisk tendens mot kvällspreferens. Du kan naturligt vara mer alert senare på dagen.',
    },
    {
      id: 'intermediate_type',
      condition: 'intermediate_score >= 0.5 OR (morning_score == evening_score)',
      label: 'Intermediär dygnsrytm',
      confidence: 'low',
      description: 'Ingen stark genetisk lutning åt något håll. Din dygnsrytm formas mer av livsstil och vanor.',
    },
  ],
  
  explanations: {
    means: 'Visar en svag genetisk tendens som KAN påverka din naturliga dygnsrytm. CLOCK-genen är involverad i den inre klockan.',
    not_means: 'Detta är INTE en bestämning av när du "borde" sova eller vakna. Livsstil, ljusexponering och vanor har MYCKET större påverkan än genetik.',
    limitations: [
      'Kronotyp påverkas av hundratals gener - detta är bara EN',
      'Ålder påverkar kronotyp kraftigt (tonåringar → kvällstyper)',
      'Livsstil och vanor dominerar över genetik',
      'Effektstorleken i forskning är mycket liten',
      'Konfidens: LÅG - använd ej för beslut',
    ],
  },
  
  created_at: Date.now(),
  version: '1.0',
}

// =============================================================================
// Export All Traits
// =============================================================================

export const ALL_TRAITS: TraitDefinition[] = [
  TRAIT_COMT_STRESS,
  TRAIT_MTHFR_FOLATE,
  TRAIT_CAFFEINE_METABOLISM,
  TRAIT_BDNF_NEUROPLASTICITY,
  TRAIT_ALCOHOL_FLUSH,
  TRAIT_LACTOSE_TOLERANCE,
  TRAIT_CHRONOTYPE,
]

export const TRAIT_MAP: Map<string, TraitDefinition> = new Map(
  ALL_TRAITS.map(t => [t.id, t])
)

// =============================================================================
// Developer Documentation
// =============================================================================

/**
 * HOW THE SCORING RULES WORK:
 * 
 * 1. Each SNP contributes to one or more "dimension scores" based on genotype
 * 2. The scoring_model.dimensions defines which scores exist
 * 3. Each allele_effects entry maps a genotype to a direction and weight
 * 4. The direction matches a dimension (e.g., "warrior" -> "warrior_score")
 * 5. Classification rules use simple boolean expressions comparing scores
 * 
 * EXAMPLE (COMT):
 * - User has rs4680 = G;G
 * - allele_effects["G;G"] = { direction: "warrior", weight: 1.0 }
 * - warrior_score += 1.0
 * - Classification rule "warrior_score > worrier_score" matches
 * - Result: "Warrior-typ"
 * 
 * MULTI-STATE REQUIREMENT:
 * Every trait MUST have at least 3 states including an intermediate.
 * This prevents binary thinking and acknowledges genetic complexity.
 * 
 * CONFIDENCE CEILING:
 * Behavioral traits are capped at "medium" confidence because:
 * - Gene-behavior links are complex and influenced by environment
 * - Effect sizes in research are typically small
 * - Individual variation is high
 * 
 * Metabolic traits can have "high" confidence when:
 * - The gene directly encodes the metabolizing enzyme
 * - Research is well-replicated
 * - Effect is mechanistically understood
 */
