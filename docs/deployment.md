# Deployment Guide

## Building for Production

Build the application:

```bash
npm run build
```

This creates a `dist/` folder with production-ready static files:

```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── ...
└── ...
```

## Local Preview

Test the production build locally:

```bash
npm run preview
```

Or use any static file server:

```bash
npx serve dist
```

## Deployment Options

### Netlify

1. Connect your GitHub repository to Netlify
2. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
3. Add environment variables in Site settings → Environment variables:
   - `VITE_LLM_PLANNER_ENDPOINT`
   - `VITE_LLM_INTERPRETER_ENDPOINT`
4. Deploy

### Vercel

1. Import your repository on Vercel
2. Framework preset: Vite
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add environment variables in Project Settings
6. Deploy

### GitHub Pages

1. Install gh-pages:

   ```bash
   npm install gh-pages --save-dev
   ```

2. Add to `package.json`:

   ```json
   "scripts": {
     "deploy": "npm run build && gh-pages -d dist"
   }
   ```

3. Configure `vite.config.ts` for your repo:

   ```typescript
   export default defineConfig({
     base: '/your-repo-name/',
     // ...
   })
   ```

4. Deploy:
   ```bash
   npm run deploy
   ```

### Docker

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Create `nginx.conf`:

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

Build and run:

```bash
docker build -t dna-chat-app .
docker run -p 8080:80 dna-chat-app
```

## Environment Variables

Set these in your hosting platform:

| Variable                        | Required | Description         |
| ------------------------------- | -------- | ------------------- |
| `VITE_LLM_PLANNER_ENDPOINT`     | Yes      | Planner API URL     |
| `VITE_LLM_INTERPRETER_ENDPOINT` | Yes      | Interpreter API URL |

**Important**: These must be set at **build time**, not runtime, because Vite inlines them during the build process.

## API Key Security

### Never Expose API Keys

❌ **Wrong**: Include API key in client code

```typescript
// NEVER DO THIS
const response = await fetch('https://api.openai.com/...', {
  headers: { Authorization: 'Bearer sk-...' },
})
```

✅ **Correct**: Use a backend proxy

```typescript
// Client calls your proxy
const response = await fetch('https://your-proxy.com/planner', {
  body: JSON.stringify({ prompt }),
})

// Proxy adds the API key server-side
```

### Backend Proxy Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Browser   │────>│  Your Proxy  │────>│ Azure OpenAI│
│  (no keys)  │<────│  (has keys)  │<────│             │
└─────────────┘     └──────────────┘     └─────────────┘
```

### Proxy Implementation Example

Using Express.js:

```javascript
const express = require('express')
const fetch = require('node-fetch')

const app = express()
app.use(express.json())

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

app.post('/planner', async (req, res) => {
  const { prompt } = req.body

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const data = await response.json()
  res.json(data)
})

app.listen(3001)
```

## Content Security Policy

Add CSP headers to restrict what resources the app can load:

### Nginx

```nginx
add_header Content-Security-Policy "
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  connect-src 'self' https://your-proxy.example.com;
  img-src 'self' data:;
  font-src 'self';
" always;
```

### Netlify

Create `netlify.toml`:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://your-proxy.example.com;"
```

### Vercel

Create `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://your-proxy.example.com;"
        }
      ]
    }
  ]
}
```

## Performance Optimization

### Compression

Enable gzip/brotli compression on your server:

```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
```

### Caching

Set cache headers for static assets:

```nginx
location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Preloading

The build automatically includes preload hints for critical assets.

## Monitoring

Consider adding:

1. **Error tracking** - Sentry, LogRocket
2. **Analytics** - Plausible, Fathom (privacy-friendly)
3. **Uptime monitoring** - UptimeRobot, Pingdom

## Checklist

Before deploying:

- [ ] Environment variables configured
- [ ] Backend proxy deployed with API keys
- [ ] CSP headers configured
- [ ] HTTPS enabled
- [ ] Error handling tested
- [ ] Performance tested
- [ ] Privacy policy accessible
