import react from '@vitejs/plugin-react'
import netlify from '@netlify/vite-plugin'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), netlify()],
    root: 'frontend',
    build: {
      outDir: '../dist',
      emptyOutDir: true,
    },
})
