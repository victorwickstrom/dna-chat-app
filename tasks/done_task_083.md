### Task 83: Document the system architecture.

1. Create `docs/architecture.md`. Describe the major parts of the application:
   - **Client**: Describe components like `FileUpload`, `Chat`, `Preferences`, and pages. Explain context providers and state management.
   - **DNA Parsing**: Explain how the Web Worker parses files using vendor detection, decompression, normalization, progress reporting, and communicates with the main thread via `parseDNA` wrapper.
   - **LLM Integration**: Outline the two-step process: sending a Planner prompt to generate `QueryPlan` JSON, matching SNPs locally, and sending an Interpreter prompt with minimal data.
   - **Local Memory**: Explain the IndexedDB stores for SNP index, preferences, topic weights, knowledge graph, conversation summaries. Describe how the system learns user interests over time.
   - **Safety and Privacy**: Summarize the safety classifier, genotypes confirmation, data privacy, and how raw DNA stays local.
2. Use diagrams where possible (e.g., a simple flowchart). You can create an image using an external tool or ASCII art if necessary.
3. Provide file references or links to relevant code sections for more details.
