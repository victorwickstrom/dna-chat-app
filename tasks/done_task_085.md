### Task 85: Document the local memory model.

1. Create `docs/memory.md`. Explain the purpose of each memory store:
   - **Preferences**: Stores user preferences for explanation style, tone, language, and genotype confirmation behaviour.
   - **TopicWeights**: Tracks the user's interest in various genetic topics, increased whenever questions relate to that topic.
   - **KnowledgeGraph**: Records genes, pathways, and traits mentioned in interpreter responses with counts.
   - **ConversationSummaries** (optional): Stores high-level summaries of conversations for future context.
2. Describe how users can view and edit this data via the Memory Overview page, and how it influences the prompts sent to the LLM.
3. Include a section on data control: how to reset, export, and import memory.
