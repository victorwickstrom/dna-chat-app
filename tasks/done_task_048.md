### Task 48: Implement a panel to view QueryPlan and MatchResult.

1. Create `src/components/JsonPanel.tsx`. This component accepts `title: string` and `json: object | string` as props and displays a collapsible panel showing formatted JSON data.
2. Use `<details><summary>{title}</summary><pre>{JSON.stringify(json, null, 2)}</pre></details>` for a native HTML collapsible element, or implement a custom toggle with Tailwind.
3. Add this component below each interpreter response so users can inspect exactly what was sent to the LLM.
4. Include a small notice explaining that this data was sent to the LLM for transparency.
