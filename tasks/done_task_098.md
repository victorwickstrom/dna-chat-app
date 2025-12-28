### Task 98: Optimize UI responsiveness for long operations.

1. Ensure that all long-running operations (e.g., parsing, computing hashes, LLM calls) are asynchronous and do not block the main UI thread.
2. Use `useEffect` and `useState` hooks to manage loading states. Show spinners or disabled controls during API calls.
3. When waiting for LLM responses, display a temporary system message like "Analyzing your genetic data…" so the user knows the system is working.
4. Debounce or throttle repeated user questions if they type quickly to avoid sending duplicate requests.
5. Use React's suspense or lazy loading for secondary pages (Settings, Privacy) to improve initial load time.
