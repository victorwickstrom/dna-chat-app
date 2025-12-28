### Task 92: Set up environment variable handling.

1. Create a `.env.local` file in your project root (do not commit this file). Add your LLM endpoints:
   ```env
   VITE_LLM_PLANNER_ENDPOINT=https://your-server.com/api/planner
   VITE_LLM_INTERPRETER_ENDPOINT=https://your-server.com/api/interpreter
   ```
2. In your code, access these variables via `import.meta.env.VITE_LLM_PLANNER_ENDPOINT` and `import.meta.env.VITE_LLM_INTERPRETER_ENDPOINT`. Vite will inject these values at build time.
3. Ensure that `.env.local` is ignored in your `.gitignore`.
4. Document the usage of these variables in `docs/environment.md` (see Task 89).
