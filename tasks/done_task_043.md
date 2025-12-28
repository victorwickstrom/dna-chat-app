### Task 43: Build Interpreter user prompt helper.

    1. In `src/utils/interpreter.ts`, export a function `buildInterpreterUserPrompt(question: string, plan: QueryPlan, match: MatchResult, memory: any, prefs: Preferences): string`.
    2. Construct the prompt using template literals. Include:
       - The original question.
       - A JSON string of the `plan` and `match` (use `JSON.stringify` with spacing to ensure readability).
       - Preference values (e.g., explanation level, tone) and important memory context (e.g., top 3 topics of interest).
       - A directive telling the LLM to interpret the genotypes in context, emphasize uncertainty, avoid diagnostic language, and return an object with fields: `answer_markdown`, `key_points`, `uncertainty`, `used_snps`, `what_this_does_not_mean`, and `follow_up_questions`.
       - Example prompt structure:
         ```
         "User question: ...

" + "Genetic data: {plan_and_match_json}
" + "Preferences: explanation level = {prefs.explanationLevel}, tone = {prefs.tone}, show uncertainty = {prefs.showUncertainty}
" + "Context: {memory topics}
" + "Please interpret the genetic data in relation to the question without making a diagnosis."
``` 3. Ensure the plan and match JSON are properly escaped (e.g., by wrapping in triple backticks) to avoid formatting issues in the LLM.
