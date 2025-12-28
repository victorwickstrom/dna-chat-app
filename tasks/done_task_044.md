### Task 44: Build Interpreter system prompt helper.

1. In the same file `src/utils/interpreter.ts`, export a function `buildInterpreterSystemPrompt(language: string): string` that returns a constant system instruction for the interpreter role.
2. The prompt should instruct the LLM to act as a genetics educator. It should:
   - Explain that the raw DNA data is local and only minimal genotype info is provided.
   - Emphasize uncertainty and evidence levels.
   - Warn against deterministic statements.
   - Provide a template for the JSON response fields.
3. For Swedish, use clear language like: "Du är en genetikutbildare som tolkar genetiska signaler utifrån en fråga".
