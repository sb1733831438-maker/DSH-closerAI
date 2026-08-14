import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { SecretStore, type SecretCipher } from '../src/main/secrets.js'

const fakeCipher: SecretCipher = {
  encrypt: (plaintext) => Buffer.from(`enc:${plaintext}`, 'utf8'),
  decrypt: (ciphertext) => {
    const text = ciphertext.toString('utf8')
    if (!text.startsWith('enc:')) throw new Error('bad ciphertext')
    return text.slice(4)
  },
}

const tempDirs: string[] = []

function makeStore(): { store: SecretStore; filePath: string } {
  const dir = mkdtempSync(join(tmpdir(), 'closerai-secrets-'))
  tempDirs.push(dir)
  const filePath = join(dir, 'secrets.bin')
  return { store: new SecretStore(filePath, fakeCipher), filePath }
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('SecretStore', () => {
  it('round-trips a secret without storing plaintext', () => {
    const { store, filePath } = makeStore()
    store.set('provider-a', 'sk-super-secret')
    expect(store.get('provider-a')).toBe('sk-super-secret')

    const raw = readFileSync(filePath, 'utf8')
    expect(raw).not.toContain('sk-super-secret')
    expect(raw).toContain('provider-a')
  })

  it('returns null for unknown ids', () => {
    const { store } = makeStore()
    expect(store.get('missing')).toBeNull()
  })

  it('deletes entries and lists remaining ids', () => {
    const { store } = makeStore()
    store.set('a', '1')
    store.set('b', '2')
    expect(store.listIds().sort()).toEqual(['a', 'b'])
    store.delete('a')
    expect(store.get('a')).toBeNull()
    expect(store.listIds()).toEqual(['b'])
  })
})
