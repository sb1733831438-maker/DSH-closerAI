// Shared vitest setup: register jest-dom matchers (toBeInTheDocument, ...)
// and @testing-library/react cleanup after each test.
// Imported by all test files via vitest.config.ts setupFiles; harmless for
// node-environment tests, required for the jsdom renderer tests.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// vitest globals are disabled, so RTL cannot auto-register cleanup; do it
// here so rendered components do not accumulate between renderer tests.
afterEach(() => {
  cleanup()
})
