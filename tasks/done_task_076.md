### Task 76: Write tests for Interpreter prompt construction.

1. Create `src/tests/interpreterPrompt.test.ts`.
2. Import `buildInterpreterUserPrompt` and `buildInterpreterSystemPrompt`.
3. Provide sample `question`, `QueryPlan`, `MatchResult`, memory context, and preferences.
4. Assert that the resulting strings contain the serialized plan and match objects, the question, preference values, and context topics.
5. Test that the system prompt includes instructions about avoiding diagnosis and returning JSON fields.
