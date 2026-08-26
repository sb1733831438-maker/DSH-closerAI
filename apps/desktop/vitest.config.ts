import { defineConfig } from 'vitest/config'

// Vitest must not inherit the Vite build config (whose root is src/renderer).
export default defineConfig({
  // Match the renderer's react-jsx automatic runtime so component tests can
  // use JSX without importing React.
  esbuild: { jsx: 'automatic' },
  // vitest run defaults to production mode, which makes `react` load its
  // production CJS build that does NOT export `act` (needed by
  // @testing-library/react). Force the development build for tests.
  define: {
    'process.env.NODE_ENV': JSON.stringify('development'),
  },
  test: {
    root: '.',
    include: ['test/**/*.test.{ts,tsx}'],
    environmentMatchGlobs: [['test/**/*.test.tsx', 'jsdom']],
    setupFiles: ['./test/setup.ts'],
  },
})
