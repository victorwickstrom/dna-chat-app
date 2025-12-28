### Task 90: Document deployment instructions.

1. Create `docs/deployment.md` with steps to deploy the app:
   - Build the app: `npm run build` produces a production-ready `dist/` folder.
   - Serve the `dist/` folder using a static server (e.g., `serve` package) or deploy it to a static hosting service (e.g., Vercel, Netlify, GitHub Pages).
   - Configure environment variables in your hosting platform so that the planner and interpreter endpoints are correctly set.
2. Describe best practices for securing API keys on the server: never expose them in client-side code; instead use a backend proxy that calls the LLM endpoints with your secret keys.
3. Mention adding a Content Security Policy (CSP) header to restrict network requests to your LLM proxy.
