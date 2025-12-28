### Task 40: Implement logic to handle planner errors and fallback messages.

1. In `Chat.tsx`, wrap the call to `callPlanner` in a try/catch. If an error occurs (network error or validation error), append a system message explaining the failure and suggesting the user rephrase the question.
2. Define a default fallback plan that requests no SNPs (e.g., an empty `snps` array) and use this plan to call the interpreter with general context. In the interpreter prompt, instruct the LLM to explain why it cannot provide specific answers and suggest broad genetic topics the user could explore.
3. Ensure the UI does not crash when the planner returns an invalid JSON or the call fails. Always handle the error gracefully and reset any loading states.
