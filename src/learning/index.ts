/**
 * Global Learning Module
 * 
 * Auto-expands genetic analysis based on chat questions.
 * Learning is global - all users benefit via server-side persistence.
 */

export {
  detectTopicsInQuestion,
  learnFromQuestion,
  getLearningStats,
  getAvailableTopics,
  expandKnowledgeForTopic,
  initGlobalLearning,
  getAutoAnalyzeTopics,
  getLearnedSNPs,
  type TopicRequest,
  type GlobalLearningState,
} from './GlobalLearning'
