import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // o front chama /api e o Vite repassa para o backend: sem CORS no dev
    proxy: { '/api': process.env.API_URL ?? 'http://localhost:3333' },
  },
})
