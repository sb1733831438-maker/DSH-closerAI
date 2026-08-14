import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

/** Encryption primitive supplied by the host (Electron safeStorage in prod). */
export interface SecretCipher {
  encrypt(plaintext: string): Buffer
  decrypt(ciphertext: Buffer): string
}

/**
 * File-backed encrypted secret store. Every value is encrypted with the host
 * cipher before it touches disk; plaintext never appears in this file.
 * The document maps a stable id (e.g. a provider id) to a base64 ciphertext.
 */
export class SecretStore {
  private readonly filePath: string
  private readonly cipher: SecretCipher

  constructor(filePath: string, cipher: SecretCipher) {
    this.filePath = filePath
    this.cipher = cipher
  }

  private readDocument(): Record<string, string> {
    try {
      const parsed: unknown = JSON.parse(readFileSync(this.filePath, 'utf8'))
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
      const entries: Record<string, string> = {}
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === 'string') entries[key] = value
      }
      return entries
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}
      throw error
    }
  }

  private writeDocument(entries: Record<string, string>): void {
    mkdirSync(dirname(this.filePath), { recursive: true })
    writeFileSync(this.filePath, `${JSON.stringify(entries, null, 2)}\n`, { mode: 0o600 })
  }

  get(id: string): string | null {
    const encoded = this.readDocument()[id]
    if (encoded === undefined) return null
    try {
      return this.cipher.decrypt(Buffer.from(encoded, 'base64'))
    } catch {
      return null
    }
  }

  set(id: string, value: string): void {
    const entries = this.readDocument()
    entries[id] = this.cipher.encrypt(value).toString('base64')
    this.writeDocument(entries)
  }

  delete(id: string): void {
    const entries = this.readDocument()
    if (entries[id] === undefined) return
    delete entries[id]
    this.writeDocument(entries)
  }

  listIds(): string[] {
    return Object.keys(this.readDocument())
  }
}
