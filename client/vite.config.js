import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  server: {
    fs: {
      // allow serving files from the project root (one level up)
      allow: [path.resolve(__dirname, '..')]
    }
  }
})
