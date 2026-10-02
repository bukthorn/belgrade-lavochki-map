import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/belgrade-lavochki-map/',
  // MapLibre starts its worker as a module, and the worker imports a chunk
  // shared with the main bundle
  worker: { format: 'es' },
})
