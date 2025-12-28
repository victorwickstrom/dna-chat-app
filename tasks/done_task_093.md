### Task 93: Implement a service worker for offline support.

1. Use Vite's PWA plugin or Workbox to generate a service worker. Install `vite-plugin-pwa`:
   ```bash
   npm install --save-dev vite-plugin-pwa
   ```
2. In `vite.config.ts`, import and configure the plugin:
   ```ts
   import { defineConfig } from 'vite'
   import react from '@vitejs/plugin-react'
   import { VitePWA } from 'vite-plugin-pwa'
   export default defineConfig({
     plugins: [
       react(),
       VitePWA({
         registerType: 'autoUpdate',
         workbox: {
           runtimeCaching: [
             {
               urlPattern: /\/api\/.*\/interpreter/,
               handler: 'NetworkOnly',
             },
             {
               urlPattern: /\/api\/.*\/planner/,
               handler: 'NetworkOnly',
             },
             {
               urlPattern: /.*/, // Cache all other assets (images, CSS, JS)
               handler: 'StaleWhileRevalidate',
             },
           ],
         },
       }),
     ],
   })
   ```
3. This configuration caches static assets while ensuring API calls always go to the network. Deploying this ensures the app loads even without network access (although API calls will still fail offline).
4. Test offline behaviour by running the app in your browser, opening DevTools, going to Application > Service Workers, and ticking "Offline".
