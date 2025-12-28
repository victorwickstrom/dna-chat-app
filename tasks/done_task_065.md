### Task 65: Create a global error boundary component.

1. Create `src/components/ErrorBoundary.tsx`. It should be a class component or a functional component using `useErrorHandler` from `react-error-boundary` (install if necessary).
2. Implement `componentDidCatch` (or the error handler) to log errors and display a fallback UI with a friendly message and a "Reload" button.
3. Wrap your `<App />` component with the `ErrorBoundary` in `main.tsx` so that uncaught errors display this fallback instead of crashing the entire app.
4. The fallback UI should not reveal technical details; instead say something like "Something went wrong. Please reload the page or contact support.".
5. Provide a way for the user to report the error (optional).
