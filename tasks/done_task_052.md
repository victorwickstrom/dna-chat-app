### Task 52: Update topic weights after each conversation.

1. After receiving and validating a `QueryPlan`, extract the `intent` and `topic` fields. Increment the weight for that topic in the `topicWeights` store.
2. Create a helper `updateTopicWeights(plan: QueryPlan)` that loads existing weights from IndexedDB, updates the relevant topic by adding a small increment (e.g., +0.5), and saves the updated weights back.
3. In future requests to the planner, include the top 3 topics (sorted by weight) as context in the user prompt.
4. Use this dynamic context to personalize responses over time.
