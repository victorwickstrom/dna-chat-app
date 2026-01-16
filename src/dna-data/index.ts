/**
 * DNA Data Integration Layer
 * 
 * Single entry point for all DNA data access and analysis.
 * 
 * Usage:
 *   import { DataRegistry } from '@/dna-data';
 *   await DataRegistry.initialize();
 *   const analysis = await DataRegistry.buildAnalysis(userRsids);
 */

// Main entry point
export { DataRegistry } from './DataRegistry';
export type { BuildAnalysisOptions } from './DataRegistry';

// Types (for consumers who need type definitions)
export type {
  AnalysisSummary,
  AnalysisDomains,
  DomainSummary,
  Highlight,
  SignalStrength,
  GeneticModel,
  ModelDomain,
  EvidenceLevel,
  RiskClass,
  Metadata,
} from './ModelTypes';

// Utility exports for advanced use cases
export { IndexLoader } from './IndexLoader';
export { ModelLoader } from './ModelLoader';
export { rankModels, rankModelsWithScores } from './PriorityEngine';
export { buildAnalysis, createEmptyAnalysis } from './AnalysisBuilder';
