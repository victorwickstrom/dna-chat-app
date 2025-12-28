### Task 61: Add warning for questions requiring physician consultation.

1. Create a constant message (e.g., `const SAFE_RESPONSE = 'We cannot answer diagnostic or treatment questions. Please consult a healthcare professional.'`).
2. In `Chat.tsx`, after classifying the question, if `diagnostic` or `prescriptive` is true, append a system message with `SAFE_RESPONSE` instead of calling the planner.
3. If `containsPII` is true, show a message like "Please remove personal identifiers from your question." and do not proceed.
4. Ensure that these messages are styled consistently with other system responses (e.g., using the same message component with a distinctive color).
