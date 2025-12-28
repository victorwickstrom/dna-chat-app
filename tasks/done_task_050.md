### Task 50: Implement local memory storage for user preferences and context.

1. Expand your IndexedDB database (from Task 26) by adding stores for `preferences`, `topicWeights`, `knowledgeGraph`, and `conversationSummaries`.
2. Provide functions `savePreferences(prefs: Preferences)` and `loadPreferences(): Promise<Preferences>` that save and retrieve preferences from the database. If no preferences exist, return default values (see Task 15).
3. Provide functions to update `topicWeights`: increment the weight of a topic whenever the planner or interpreter references it. Use a structure like `{ [topic: string]: number }`.
4. Provide functions to update the `knowledgeGraph`, which stores counts or relevance weights for genes, pathways, and traits mentioned in responses.
5. Provide a way to summarize conversations (e.g., by storing extracted topics and key points) in `conversationSummaries`.
6. Update `GlobalContext` to include `preferences`, `topicWeights`, and `knowledgeGraph` along with setters.
