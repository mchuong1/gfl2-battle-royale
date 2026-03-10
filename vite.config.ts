import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// ---------------------------------------------------------------------------
// Virtual module: 'virtual:public-images'
// Reads public/images/ at build time and exports the sorted list of filenames.
// Adding or removing an image file is all that's needed – no code changes required.
// ---------------------------------------------------------------------------
function publicImagesPlugin() {
  const virtualId = 'virtual:public-images'
  const resolvedId = '\0' + virtualId

  return {
    name: 'public-images',
    resolveId(id: string) {
      if (id === virtualId) return resolvedId
    },
    load(id: string) {
      if (id !== resolvedId) return
      const dir = path.resolve(__dirname, 'public/images')
      const files = fs
        .readdirSync(dir)
        .filter((f) => /\.(png|jpe?g|webp|avif)$/i.test(f))
        .sort()
      return `export const imageFiles = ${JSON.stringify(files)};`
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [publicImagesPlugin(), react()],
  server: {
    headers: {
      // Allow eval which Vite's dev-mode HMR requires
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src blob:; connect-src 'self' ws://localhost:* wss://localhost:* http://localhost:* https://localhost:*;",
    },
  },
})
