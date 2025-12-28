### Task 88: Document test execution and continuous integration.

1. Create `docs/tests.md`. Explain how to run tests locally using `npm test` and how tests are organized (unit tests in `src/tests/`, integration tests in the same folder with `.test.tsx` suffix).
2. Describe how the GitHub Actions workflow executes the tests on each push and pull request.
3. Provide guidance on writing additional tests when adding features: use Jest and Testing Library, mock network requests with `msw`, and isolate IndexedDB operations.
4. Mention how to view test coverage reports if configured (optional).
