### Task 36: Build Planner system and user prompt helpers.

    1. In `src/utils/planner.ts`, export two functions:
       - `buildPlannerSystemPrompt(language: string = 'sv'): string` that returns a constant template instructing the LLM to act as a genetics query planner. The template should include:
         * A statement of its role: e.g., "Du är en genetikplanerare som returnerar JSON".
         * An instruction to reply with a JSON object containing keys (`version`, `intent`, `topic`, `snps`, etc.).
         * A directive to not ask for genotype data.
       - `buildPlannerUserPrompt(question: string, memory: any, prefs: Preferences): string` that takes the user's question, optionally includes hints from the user's topic weights from memory, and uses the `language` preference to instruct the LLM to respond in Swedish or English. Format:
         ```md
         "Question: {question}

Preferences: {prefs.explanationLevel}, {prefs.tone}
Context: {list of top topics from memory}
"
``` 2. Document these functions in comments so future maintainers know their purpose.
