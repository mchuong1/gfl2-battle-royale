import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      // Allow eval which Vite's dev-mode HMR requires
      'Content-Security-Policy': "script-src 'self' 'unsafe-eval' 'unsafe-inline'; default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src blob:;",
    },
  },
})
