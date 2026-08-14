import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The onboarding UI is loaded from file:// inside the Electron shell, so the
// bundle must use relative asset paths and inline everything local.
export default defineConfig({
  root: 'src/renderer',
  base: './',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
  },
  plugins: [react()],
})
