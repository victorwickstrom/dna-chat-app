### Task 55: Implement memory editing and deletion.

1. Provide a function `removeTopic(topic: string)` that deletes the topic from `topicWeights` and updates the store.
2. Provide a function `removeGene(gene: string)` and similar functions for pathways and traits in the knowledge graph.
3. In `MemoryOverview.tsx`, add buttons or icons next to each item to remove or modify its weight. Use a confirmation dialog before removing to avoid accidental deletions.
4. When modifying a weight, open a modal with a slider or input to adjust the value. Save changes back to IndexedDB and update context state.
