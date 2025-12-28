### Task 79: Write tests for the safety classifier.

1. Create `src/tests/safety.test.ts`.
2. Import `classifyQuestion` from `src/utils/safety`.
3. Test various questions:
   - Diagnostic question: "Do I have autism?" → expect `diagnostic = true`.
   - Prescriptive question: "Should I take medication X?" → expect `prescriptive = true`.
   - PII question: "My email is user@example.com" → expect `pii = true`.
   - Normal question: "What can my DNA tell me about metabolism?" → expect all flags to be false.
4. Assert that the classifier correctly identifies each case.
