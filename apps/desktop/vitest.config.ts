import { defineConfig } from 'vitest/config'

// Vitest must not inherit the Vite build config (whose root is src/renderer).
export default defineConfig({
  test: {
    root: '.',
    include: ['test/**/*.test.ts'],
  },
})
