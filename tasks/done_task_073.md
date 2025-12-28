### Task 73: Write tests for Planner prompt construction.

1. Create `src/tests/plannerPrompt.test.ts`.
2. Import `buildPlannerSystemPrompt` and `buildPlannerUserPrompt`.
3. Test that `buildPlannerSystemPrompt` returns a string containing key instructions like returning JSON and not asking for genotype.
4. Test that `buildPlannerUserPrompt` correctly interpolates the question, preferences, and memory context. Check that the `language` preference influences the language of the prompt (e.g., Swedish vs English instructions).
5. Use snapshots or regex to assert that the output matches expectations.
