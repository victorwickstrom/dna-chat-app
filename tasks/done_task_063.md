### Task 63: Implement a privacy information page.

1. Create `src/pages/Privacy.tsx` or a Markdown file compiled to a page using a plugin. This page should explain:
   - That raw DNA data stays in the user's browser and is never uploaded.
   - Only minimal genotype summaries are sent to the LLM for interpretation.
   - What data is stored in local storage (IndexedDB), and how to delete or export it.
   - The service does not provide medical advice.
2. Link to this page from the settings or footer of the application.
3. Ensure the text is available in both languages using your translation system.
4. Use headings and lists to make the policy easy to read. Include the last updated date at the top.
