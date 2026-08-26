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
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/preload/**', 'src/renderer/main.tsx', 'src/renderer/src/index.css'],
      // Baselines measured 2026-08-27 (lines 50%, branches 77%, funcs 69%);
      // thresholds sit a little below so the gate catches regressions without
      // blocking legitimate feature work (R-10).
      thresholds: {
        statements: 45,
        branches: 70,
        functions: 60,
        lines: 45,
      },
    },
  },
})
