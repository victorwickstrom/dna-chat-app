### Task 5: Create project directory structure.

Organize your project into a clear structure. Create the following directories and subdirectories inside `dna-chat-app`:

- `src/` — top-level source folder
  - `components/` — React components (e.g., file upload, chat UI, panels)
  - `context/` — React context providers for global state (preferences, memory)
  - `models/` — TypeScript interfaces and types (e.g., QueryPlan, MatchResult, InterpreterResponse)
  - `services/` — API calls and LLM interaction functions
  - `utils/` — helper functions (decompression, vendor detection, normalization)
  - `workers/` — Web Workers (DNA parsing)
  - `pages/` — page components if using routing (optional)
  - `hooks/` — custom React hooks for internal logic
  - `styles/` — Tailwind base styles (e.g., index.css)
  - `tests/` — unit and integration test files
    Use commands like:

```bash
mkdir -p src/{components,context,models,services,utils,workers,pages,hooks,styles,tests}
```

This standard structure helps you and collaborators navigate the codebase easily.
