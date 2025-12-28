### Task 80: Write integration tests for the end-to-end flow.

1. Create `src/tests/integration.test.tsx`.
2. Use `msw` (Mock Service Worker) to mock responses from `callPlanner` and `callInterpreter`. Provide a mock QueryPlan JSON and a mock InterpreterResponse JSON.
3. Render the entire App (or the Chat component with FileUpload) using a mock context and a test SNP index loaded via `saveSNPIndex`.
4. Simulate the user typing a question, confirm sending genotypes if required, and await the system response.
5. Assert that the response fields (markdown, key points, etc.) are rendered correctly.
6. Clean up and restore mocks after the test.
