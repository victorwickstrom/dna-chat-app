# Environment Variables

## Overview

DNA Chat Assistant uses Vite for bundling, which has a specific approach to environment variables. Only variables prefixed with `VITE_` are exposed to the client-side code.

## How It Works

Vite loads environment variables from `.env` files:

- `.env` - Loaded in all cases
- `.env.local` - Loaded in all cases, ignored by git
- `.env.development` - Only loaded in development
- `.env.production` - Only loaded in production

Variables are accessed via `import.meta.env`:

```typescript
const plannerEndpoint = import.meta.env.VITE_LLM_PLANNER_ENDPOINT
```

## Required Variables

| Variable                        | Description                           |
| ------------------------------- | ------------------------------------- |
| `VITE_LLM_PLANNER_ENDPOINT`     | URL for the Query Planner LLM service |
| `VITE_LLM_INTERPRETER_ENDPOINT` | URL for the Interpreter LLM service   |

## Configuration

### Local Development

Create a `.env.local` file in the project root (this file is gitignored):

```env
VITE_LLM_PLANNER_ENDPOINT=https://api.your-proxy.example.com/planner
VITE_LLM_INTERPRETER_ENDPOINT=https://api.your-proxy.example.com/interpreter
```

### Production

Set environment variables in your deployment platform (Netlify, Vercel, etc.):

```
VITE_LLM_PLANNER_ENDPOINT=https://api.production.example.com/planner
VITE_LLM_INTERPRETER_ENDPOINT=https://api.production.example.com/interpreter
```

## Example `.env.local`

```env
# LLM Service Endpoints
# These should point to your proxy server, NOT directly to OpenAI/Azure
VITE_LLM_PLANNER_ENDPOINT=https://api.openai-proxy.example.com/planner
VITE_LLM_INTERPRETER_ENDPOINT=https://api.openai-proxy.example.com/interpreter

# Optional: Debug mode
VITE_DEBUG=true
```

## Security Considerations

### Never Commit Secrets

- `.env.local` is gitignored by default
- Never commit API keys or endpoint URLs to source control
- Use environment variables in your CI/CD pipeline

### Proxy Architecture

The endpoints should be **proxy servers**, not direct OpenAI/Azure URLs:

```
Browser → Your Proxy → Azure OpenAI
```

**Why use a proxy?**

1. **API Key Protection** - Your OpenAI API key stays on the server
2. **Rate Limiting** - Control usage per user
3. **Logging** - Track usage without storing sensitive data
4. **Data Filtering** - Ensure no raw DNA is accidentally sent

### What the Proxy Should Do

1. Accept requests from the client
2. Validate request format
3. Add your OpenAI API key
4. Forward to Azure OpenAI
5. Return the response

### What the Proxy Should NOT Do

1. Log or store genotype data
2. Accept raw DNA file uploads
3. Expose the API key to clients

## Type Safety

For TypeScript type safety, declare environment variables in `src/vite-env.d.ts`:

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LLM_PLANNER_ENDPOINT: string
  readonly VITE_LLM_INTERPRETER_ENDPOINT: string
  readonly VITE_DEBUG?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

## Usage in Code

```typescript
// src/services/llm.ts
const PLANNER_ENDPOINT = import.meta.env.VITE_LLM_PLANNER_ENDPOINT
const INTERPRETER_ENDPOINT = import.meta.env.VITE_LLM_INTERPRETER_ENDPOINT

export const callPlanner = async (prompt: string) => {
  const response = await fetch(PLANNER_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })
  return response.json()
}
```

## Troubleshooting

### Variables Not Loading

1. Ensure the variable name starts with `VITE_`
2. Restart the dev server after changing `.env` files
3. Check for typos in variable names

### Variables Undefined in Production

1. Verify variables are set in your deployment platform
2. Check that the build process has access to the variables
3. Rebuild after setting new variables

### CORS Errors

If you see CORS errors, your proxy server needs to include proper CORS headers:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```
