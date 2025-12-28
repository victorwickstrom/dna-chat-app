import type { InterpreterResponse } from '../models/interpreter'
import type { QueryPlan } from '../models/queryPlan'
import { incrementKnowledgeGraph } from '../storage'

export const updateKnowledgeGraph = async (
  plan: QueryPlan,
  response: InterpreterResponse
): Promise<void> => {
  const entities = new Set<string>()

  for (const snp of plan.snps) {
    if (snp.gene) {
      entities.add(`gene:${snp.gene}`)
    }
  }

  for (const snp of response.used_snps ?? []) {
    entities.add(`snp:${snp.rsid}`)
  }

  if (plan.topic) {
    entities.add(`topic:${plan.topic}`)
  }

  for (const entity of entities) {
    await incrementKnowledgeGraph(entity)
  }
}
