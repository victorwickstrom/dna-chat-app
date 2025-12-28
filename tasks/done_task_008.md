### Task 8: Configure Vite for React and Tailwind.

1. Create `vite.config.ts` in the project root to configure Vite. Import the React plugin and define the configuration:

   ```ts
   // vite.config.ts
   import { defineConfig } from 'vite'
   import react from '@vitejs/plugin-react'

   export default defineConfig({
     plugins: [react()],
     server: {
       port: 3000,
     },
     build: {
       target: 'esnext',
       outDir: 'dist',
     },
     resolve: {
       alias: {
         '@': '/src',
       },
     },
   })
   ```

2. Update the `scripts` section of your `package.json` to add commands for development, building, and preview:
   ```json
   {
     "scripts": {
       "dev": "vite",
       "build": "vite build",
       "preview": "vite preview"
     }
   }
   ```
3. Ensure your environment variables are loaded: Vite automatically loads variables prefaced with `VITE_` from `.env.local`.
