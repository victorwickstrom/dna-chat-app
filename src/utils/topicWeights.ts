import type { QueryPlan } from '../models/queryPlan'
import { getTopicWeights, incrementTopicWeight } from '../storage'

export const updateTopicWeights = async (plan: QueryPlan): Promise<void> => {
  if (plan.topic) {
    await incrementTopicWeight(plan.topic)
  }
}

export const getTopThreeTopics = async (): Promise<Record<string, number>> => {
  const weights = await getTopicWeights()
  const sorted = Object.entries(weights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
  return Object.fromEntries(sorted)
}
