### Task 47: Parse and render interpreter responses.

1. In your `Chat` component, after calling `callInterpreter` and receiving an `InterpreterResponse`, render its content:
   - Use `react-markdown` to render `response.answer_markdown` into HTML.
   - Display `key_points` in a bulleted list.
   - Show a text label or colored indicator for the `uncertainty` field.
   - Display a table for `used_snps` with columns: rsid, genotype, evidence level.
   - Display `what_this_does_not_mean` as a list preceded by a warning icon or bold heading.
   - Display `follow_up_questions` as clickable suggestions that users can send automatically.
2. Append each of these sections as separate system messages or group them into a single message with subheadings.
3. Ensure each list or table has appropriate CSS for readability (e.g., using Tailwind classes like `divide-y`, `border`, etc.).
4. Scroll the chat view to the bottom after rendering to keep the latest response visible.
