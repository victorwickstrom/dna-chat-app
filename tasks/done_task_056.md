### Task 56: Implement the reset memory feature.

1. Create a function `resetMemory()` in your storage module that clears `topicWeights`, `knowledgeGraph`, and `conversationSummaries` stores while leaving `preferences` intact unless explicitly specified.
2. In your settings page (Task 72), add a "Reset Data" button. When clicked, display a confirmation message explaining that all personalized memory will be deleted (SNP index is unaffected).
3. If the user confirms, call `resetMemory()`, clear relevant context state, and reload the page or update components to reflect the reset.
4. Provide feedback to the user that the reset was successful.
