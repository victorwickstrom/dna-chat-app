### Task 60: Create a safety classifier for user questions.

1. In `src/utils/safety.ts`, implement functions to detect sensitive content in user questions:
   - `containsPII(question: string): boolean` that uses regex to detect email addresses, phone numbers, credit card numbers, or other personally identifiable patterns.
   - `isDiagnostic(question: string): boolean` that detects phrases like "Do I have", "Am I", "Does my DNA indicate", combined with disease names or conditions.
   - `isPrescriptive(question: string): boolean` that detects phrases like "Should I", "Can I cure", "What medication", etc.
2. Export a single function `classifyQuestion(question: string)` that returns an object `{ pii: boolean, diagnostic: boolean, prescriptive: boolean }`.
3. Use this classifier in `handleSend` (Task 35). If any flag is true:
   - Do not call the planner or interpreter.
   - Display a safe message reminding the user that the service cannot provide diagnosis or treatment advice and advising them to consult a healthcare professional. Also remind them not to share personal details.
4. Optionally, log the occurrence (without storing user data) for analytics or debugging.
