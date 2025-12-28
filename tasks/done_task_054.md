### Task 54: Create a page to display what the system remembers about the user.

1. Create `src/components/MemoryOverview.tsx` that reads data from `topicWeights` and `knowledgeGraph` in context.
2. Display topics with their weights in descending order using a bar chart or table (e.g., `<ul>` with weight values). Use the `recharts` library (already available in your environment) to render a bar chart.
3. Display the most referenced genes, pathways, and traits similarly.
4. List key assumptions or conversation summaries stored in `conversationSummaries`, if you implement that feature.
5. Provide an edit or delete button next to each item. When clicked, open a modal allowing the user to confirm removal or adjust a weight manually.
6. Update the context and IndexedDB storage when items are modified or removed.
