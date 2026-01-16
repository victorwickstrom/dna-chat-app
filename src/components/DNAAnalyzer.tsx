/**
 * DNAAnalyzer - Main entry point for DNA analysis view
 * 
 * Now uses the new RiskAnalysisView which displays:
 * - Primary SNP matches from restructured_snp.json
 * - AI-enriched explanations from backend (with caching)
 * - Tabbed interface for detailed information
 */

import RiskAnalysisView from './RiskAnalysisView'

const DNAAnalyzer = () => {
  return <RiskAnalysisView />
}

export default DNAAnalyzer
