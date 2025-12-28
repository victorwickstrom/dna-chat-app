### Task 89: Document environment variables and API configuration.

1. Create `docs/environment.md` explaining how environment variables are loaded in Vite. Explain that variables prefixed with `VITE_` are exposed to the client.
2. List required variables: `VITE_LLM_PLANNER_ENDPOINT` and `VITE_LLM_INTERPRETER_ENDPOINT`. Describe where to set these (e.g., in `.env.local`) and caution not to commit them to source control.
3. Provide an example `.env.local` file:
   ```env
   VITE_LLM_PLANNER_ENDPOINT=https://api.openai-proxy.example.com/planner
   VITE_LLM_INTERPRETER_ENDPOINT=https://api.openai-proxy.example.com/interpreter
   ```
4. Explain that these endpoints should proxy calls to Azure OpenAI and should not accept raw DNA data.
