# DNA Chat Assistant Manual

## Introduction

This manual provides guidance on setting up, using, and maintaining your privacy-first DNA Chat Assistant. The application allows users to upload raw DNA data from common consumer genetic testing services (MyHeritage, 23andMe, AncestryDNA), ask questions about their genetics, and receive educational responses without ever sending raw genetic data to a server. All sensitive data remains on the user's device, and only minimal genotype summaries are transmitted to a language model for interpretation.

## Requirements

- Node.js v16 or later and npm installed.
- An Azure OpenAI or compatible LLM service with endpoints for the Planner and Interpreter. These should be exposed via a backend proxy, since API keys must not be exposed to the frontend.
- A modern browser (Chrome, Firefox, Edge) that supports Web Workers, IndexedDB, and JavaScript Modules.

## Installation and Setup

1. Clone the repository to your local machine:

   ```bash
   git clone <your-repo-url>
   cd dna-chat-app
   ```

2. Install dependencies using the deterministic lockfile:

   ```bash
   npm ci
   ```

3. Configure environment variables by creating a `.env.local` file in the project root. Define your LLM endpoints:

   ```bash
   VITE_LLM_PLANNER_ENDPOINT=https://your-server.com/api/planner
   VITE_LLM_INTERPRETER_ENDPOINT=https://your-server.com/api/interpreter
   ```

   These endpoints should forward requests to your Azure OpenAI endpoints while keeping API keys secure.

4. Run the development server:

   ```bash
   npm run dev
   ```

   Open your browser at `http://localhost:3000`. The app will reload automatically as you edit files.

## Running Tests

Unit and integration tests are executed with Jest. To run all tests:

```bash
npm test
```

Continuous integration is configured via GitHub Actions. Tests run automatically on each push and pull request. See `.github/workflows/test.yml`.

## Using the Application

### Uploading DNA Data

1. Navigate to the home page and locate the File Upload section.
2. Drag and drop a `.txt`, `.zip`, or `.gz` DNA file into the drop area, or click to select a file. Only raw DNA files from MyHeritage, 23andMe, or AncestryDNA are supported.
3. The parsing will happen locally in your browser via a Web Worker. A progress bar shows the progress of parsing and indexing. If the file has been processed before, the app will load cached data instantly.
4. After parsing completes, a summary card displays the vendor, file name, number of SNPs, and upload date.

### Asking Questions

1. Scroll to the Chat section and type a question related to your genetic data. Example: “What can my DNA tell me about inflammation?”
2. The question is first sent to the Planner model to determine relevant SNPs. The app matches these SNPs against your local index and prompts you for confirmation if genotype auto-send is disabled.
3. Once confirmed (or automatically if enabled), the minimal genotype summary (rsid and genotype) is sent to the Interpreter model, along with your question, preferences, and context.
4. The Interpreter returns a structured response. The app displays:
   - A markdown-formatted answer.
   - Key points summarizing the response.
   - The overall uncertainty level (low, medium, high).
   - A table of used SNPs with genotypes and evidence.
   - A “What this does not mean” list clarifying limitations.
   - Follow-up question suggestions.
   - A collapsible JSON panel showing the exact data sent.

### Preferences and Settings

Access the Settings page from the navigation to adjust your preferences:

- Explanation level: Layman, Normal, or Technical.
- Tone: Calm or Formal.
- Show uncertainty: Display uncertainty ratings in responses.
- Language: Swedish (sv) or English (en).
- Auto send genotypes: If disabled, you must confirm before genotypes are sent.

You can also switch languages via the language switcher in the header or settings page.

### Memory and Context

The app learns what topics you ask about and records gene, pathway, and trait mentions. Use the Memory Overview page to view and manage this data:

- See your top topics by weight (e.g., neurodiversity, inflammation) and adjust them if needed.
- View genes and pathways frequently mentioned and remove or modify them.
- Reset memory to start fresh.
- Export your memory to a JSON file or import a previously saved memory file.

### Data Privacy

- Your raw DNA file never leaves your device. All parsing and SNP matching occur within your browser.
- Only the minimal genotype summary (rsid and genotype) is sent to the LLM, along with your question and preferences.
- Local storage (IndexedDB) holds your SNP index, preferences, topics, and knowledge graph. You can clear or export/import this data at any time.
- Diagnostic or prescriptive questions (e.g., asking for a medical diagnosis or specific treatment) trigger a safe response instead of sending data to the LLM.
- Do not share personally identifying information in your questions; the app warns you if PII is detected.

## Developer Guide

- Directory Structure: See Task 5 for a detailed directory layout. Keep components, utilities, and models separated for clarity.
- Web Worker: Parsing DNA files is offloaded to a Web Worker (`src/workers/parseDNA.ts`) to prevent blocking the main thread. Communication happens via `postMessage`, and a wrapper (`src/utils/workerWrapper.ts`) abstracts this interaction.
- LLM Interaction: The Planner and Interpreter calls are implemented in `src/services/llm.ts`. Prompts are built in `src/utils/planner.ts` and `src/utils/interpreter.ts`.
- Memory: IndexedDB stores genetic data, preferences, topics, and knowledge graphs. Storage helpers are in `src/storage/index.ts`, and context providers in `src/context/AppContext.tsx`.
- Internationalization: `i18next` is configured in `src/i18n.ts`. Translation files live in `src/locales/en/` and `src/locales/sv/`.
- Testing: Tests are organized in `src/tests/` and run with Jest. Mock the network with `msw` for integration tests.

## Troubleshooting

- **Parsing Error:** Ensure the file is a supported format and comes directly from a supported DNA testing service. If you receive an unknown vendor error, check the file header and format.
- **LLM Errors:** If the Planner or Interpreter calls fail, verify that your API endpoints in `.env.local` are correct and that the backend proxy is reachable. Network failures display an error message in the chat.
- **Performance Issues:** Large DNA files may take time to parse. Ensure your browser is not overloaded, and consider closing other heavy tabs. Use a modern browser for best performance.

## Support and Contributions

If you encounter issues or have questions, please file an issue in the project's repository. Contributions are welcome—submit pull requests with clear descriptions and associated tests. Always run `npm test` and lint your code before submitting.

## Conclusion

This manual, together with the detailed task files, should enable developers to build and users to operate the DNA Chat Assistant securely and effectively. By following each task and referring back to this guide, you will ensure a smooth setup and a high-quality user experience.
