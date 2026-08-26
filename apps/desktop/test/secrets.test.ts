import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { SecretStore, type SecretCipher } from '../src/main/secrets.js'
import { storageBackendWarning } from '../src/main/safe-storage-cipher.js'

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

describe('storageBackendWarning (R-15)', () => {
  it('warns when the backend is basic_text (obfuscation, not encryption)', () => {
    const warning = storageBackendWarning('basic_text')
    expect(warning).not.toBeNull()
    expect(warning).toContain('basic_text')
  })

  it('returns null for real encryption backends', () => {
    expect(storageBackendWarning('os_crypt')).toBeNull()
    expect(storageBackendWarning('keychain')).toBeNull()
    expect(storageBackendWarning('kwallet5')).toBeNull()
    expect(storageBackendWarning('gnome_libsecret')).toBeNull()
    expect(storageBackendWarning(undefined)).toBeNull()
  })
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

  it('R-31: returns null for undecryptable ciphertext instead of throwing', () => {
    const { store, filePath } = makeStore()
    store.set('a', '1')
    // Corrupt the stored ciphertext for one id so decryption must fail.
    writeFileSync(filePath, '{"a": "not-valid-ciphertext"}', 'utf8')
    expect(store.get('a')).toBeNull()
    // other operations still work and repair the document
    store.set('b', '2')
    expect(store.get('b')).toBe('2')
  })
})
