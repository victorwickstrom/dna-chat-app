### Task 45: Create API service for the Interpreter.

1. Extend `src/services/llm.ts` with `async function callInterpreter(prompt: string): Promise<InterpreterResponse>`:
   - Read the interpreter endpoint from `import.meta.env.VITE_LLM_INTERPRETER_ENDPOINT`.
   - Send the prompt via POST request in a similar manner to `callPlanner`.
   - Parse the response as JSON. Expect the LLM's output content to contain JSON followed by a delimiter or block of plain text. Extract the JSON portion and parse it into an `InterpreterResponse`.
   - Validate required fields (`answer_markdown`, `key_points`, etc.). If missing, throw an error.
2. Handle network errors or invalid responses by throwing exceptions to be caught by the UI layer.
