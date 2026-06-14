import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev proxy forwards /api/* to a locally running `vercel dev` (port 3000)
// so the AI coach + TTS endpoints work during `npm run dev`.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
