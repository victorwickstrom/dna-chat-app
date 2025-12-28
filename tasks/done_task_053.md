### Task 53: Update knowledge graph based on interpreter responses.

1. After parsing an `InterpreterResponse`, extract gene names, pathways, and traits mentioned. For example, parse `used_snps` to get genes from the plan.
2. Create a helper `updateKnowledgeGraph(response: InterpreterResponse)` that increments counts or relevance scores for genes, pathways, and traits in the `knowledgeGraph` store.
3. Use the updated knowledge graph to tailor future planner prompts or to display relevant topics to the user.
4. Implement display functions (Task 60) to show parts of the knowledge graph in the UI.
