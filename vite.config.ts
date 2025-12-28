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
            urlPattern: /.*/,
            handler: 'StaleWhileRevalidate',
          },
        ],
      },
    }),
  ],
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
