import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { BRIDGE_METHODS, IPC } from '../src/shared/ipc.js'

/**
 * Contract test between the TypeScript `CloserAiBridge`/`IPC` contract
 * (src/shared/ipc.ts) and the hand-written sandboxed preload
 * (src/preload/index.cjs).
 *
 * The preload is plain CommonJS (cannot be ESM or typechecked), so it is the
 * classic drift risk: a renamed channel or a missing bridge method fails only
 * at runtime in the packaged app. This test turns that into a CI failure.
 * (Regression guard for R-33 / R-08: preload missing 6 declared bridge methods
 * shipped in v0.7.0.)
 */

const PRELOAD_PATH = fileURLToPath(new URL('../src/preload/index.cjs', import.meta.url))

function readPreloadSource(): string {
  return readFileSync(PRELOAD_PATH, 'utf8')
}

/** Extract the keys of a top-level `const NAME = { ... }` object literal. */
function extractObjectKeys(source: string, decl: string): string[] {
  // Linear brace-depth scan (no regex backtracking): find the declaration,
  // then read the object literal body up to its matching closing brace.
  const declStart = source.indexOf(`const ${decl} =`)
  if (declStart === -1) throw new Error(`could not find "const ${decl}" in preload source`)
  const open = source.indexOf('{', declStart)
  if (open === -1) throw new Error(`could not find "{" for const ${decl}`)
  let depth = 0
  let close = -1
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i]
    if (ch === '{') depth += 1
    else if (ch === '}') {
      depth -= 1
      if (depth === 0) {
        close = i
        break
      }
    }
  }
  if (close === -1) throw new Error(`unterminated object literal for const ${decl}`)
  const body = source.slice(open + 1, close)
  const keys: string[] = []
  for (const line of body.split('\n')) {
    const m = /^\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*:/.exec(line)
    if (m !== null) keys.push(m[1]!)
  }
  return keys
}

describe('preload bridge contract', () => {
  it('implements every IPC channel declared in shared/ipc.ts', () => {
    const source = readPreloadSource()
    const preloadChannels = extractObjectKeys(source, 'IPC')
    const sharedChannels = Object.keys(IPC)
    expect(preloadChannels.sort()).toEqual([...sharedChannels].sort())
  })

  it('implements every CloserAiBridge method (BRIDGE_METHODS) on the api object', () => {
    const source = readPreloadSource()
    const apiKeys = extractObjectKeys(source, 'api')
    for (const method of BRIDGE_METHODS) {
      expect(apiKeys).toContain(method)
    }
  })

  it('does not expose bridge methods beyond the declared interface', () => {
    const source = readPreloadSource()
    const apiKeys = extractObjectKeys(source, 'api')
    const declared = new Set([...BRIDGE_METHODS, 'platform'])
    const extras = apiKeys.filter((key) => !declared.has(key))
    expect(extras).toEqual([])
  })
})
