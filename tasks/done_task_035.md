### Task 35: Implement the send message logic with LLM integration.

1. In `Chat.tsx`, modify the `handleSend` function to integrate with the Planner and Interpreter:
   - Append the user's message to the `messages` array.
   - Build the Planner system and user prompts using helper functions (defined later).
   - Send the planner prompt to your planner endpoint via the `callPlanner` function.
   - Validate the returned QueryPlan.
   - Match the SNPs from the QueryPlan against the local SNP index (available in `snpIndex` from context).
   - If `autoSendGenotypes` is false in preferences, display a confirmation dialog with the list of SNP rsIDs and genotypes; if the user declines, abort the send.
   - Build the Interpreter system and user prompts.
   - Send them via `callInterpreter` to your interpreter endpoint.
   - Parse the JSON response into your `InterpreterResponse` interface.
   - Append system messages to the chat, rendering the markdown answer, key points, used SNPs, uncertainty, and follow-up questions.
2. Use `async`/`await` to sequence these calls. Handle errors gracefully by catching exceptions and displaying an error message.
3. Clear the input box after sending. Scroll the chat view to the bottom so new messages are visible.
