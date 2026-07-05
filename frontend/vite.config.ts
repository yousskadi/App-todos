import path from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // En dev, le navigateur ne parle qu'à Vite : pas de CORS,
    // et le cookie refresh reste en même origine (comme en prod via nginx)
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
