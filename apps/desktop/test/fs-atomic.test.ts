import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { atomicWriteFileSync } from '../src/main/fs-atomic.js'
import { CapabilitiesStore } from '../src/main/capabilities.js'
import { McpStoreFile } from '../src/main/mcp-store.js'
import { AppConfigStore } from '../src/main/mode-store.js'
import { ProjectStore } from '../src/main/project-store.js'
import { ProviderStoreFile } from '../src/main/provider-store.js'
import { SecretStore, type SecretCipher } from '../src/main/secrets.js'

/**
 * R-03: atomic persistence + corruption tolerance.
 *
 * Every app store must (a) persist via an atomic temp-write + rename so a
 * crash mid-write never leaves a truncated JSON, and (b) fall back to safe
 * defaults when the file is missing, unreadable, or corrupt, so a bad file can
 * never crash the app at startup.
 */

const dirs: string[] = []
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'closerai-atomic-'))
  dirs.push(dir)
  return dir
}
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('atomicWriteFileSync (R-03)', () => {
  it('writes content and leaves no temp file behind', () => {
    const dir = tempDir()
    const target = join(dir, 'a', 'b', 'store.json')
    atomicWriteFileSync(target, '{ "ok": true }\n')
    expect(JSON.parse(readFileSync(target, 'utf8'))).toEqual({ ok: true })
    expect(readdirSync(join(dir, 'a', 'b')).filter((f) => f.endsWith('.tmp'))).toEqual([])
  })

  it('overwrites an existing file atomically', () => {
    const dir = tempDir()
    const target = join(dir, 'store.json')
    writeFileSync(target, 'old', 'utf8')
    atomicWriteFileSync(target, 'new', undefined)
    expect(readFileSync(target, 'utf8')).toBe('new')
    expect(readdirSync(dir).filter((f) => f.endsWith('.tmp'))).toEqual([])
  })
})

describe('store corruption tolerance (R-03)', () => {
  it('every store returns defaults for a corrupt file instead of throwing', () => {
    const dir = tempDir()
    const file = join(dir, 'store.json')
    writeFileSync(file, '{ not json', 'utf8')

    const cipher: SecretCipher = {
      encrypt: (p) => Buffer.from(`c!${p}!c`, 'utf8'),
      decrypt: (c) => {
        const t = c.toString('utf8')
        return t.slice(2, -2)
      },
    }

    expect(() => new ProviderStoreFile(file).read()).not.toThrow()
    expect(() => new AppConfigStore(file).read()).not.toThrow()
    expect(() => new CapabilitiesStore(file).read()).not.toThrow()
    expect(() => new ProjectStore(file).read()).not.toThrow()
    expect(() => new McpStoreFile(file).read()).not.toThrow()
    expect(() => new SecretStore(file, cipher).get('x')).not.toThrow()

    expect(new ProviderStoreFile(file).read()).toEqual({
      activeProviderId: null,
      providers: [],
    })
    expect(new AppConfigStore(file).read().mode).toBe('chat')
    expect(new CapabilitiesStore(file).read().webSearch).toBe(true)
    expect(new ProjectStore(file).read().projects).toEqual([])
    expect(new McpStoreFile(file).read().servers).toEqual([])
    expect(new SecretStore(file, cipher).get('x')).toBeNull()
  })

  it('a corrupted store self-heals to defaults and survives a subsequent write', () => {
    const dir = tempDir()
    const file = join(dir, 'providers.json')
    writeFileSync(file, 'broken{', 'utf8')
    const store = new ProviderStoreFile(file)
    expect(store.read().providers).toEqual([])
    store.saveProfile({
      id: 'p',
      kind: 'deepseek',
      name: 'ok',
      baseUrl: 'http://x',
      defaultModel: 'm',
      models: [],
    })
    expect(store.read().providers).toHaveLength(1)
    // the repaired file is now valid JSON
    expect(() => JSON.parse(readFileSync(file, 'utf8'))).not.toThrow()
  })
})
