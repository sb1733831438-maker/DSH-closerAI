import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { SecretCipher } from './secrets.js'
import type { McpServer, McpStoreData } from '../shared/types.js'

const EMPTY_STORE: McpStoreData = { servers: [] }

/** Values shown to the renderer instead of real MCP credentials. */
const SECRET_MASK = '***'
/** Prefix marking a value stored as `enc:<base64(ciphertext)>`. */
const ENC_PREFIX = 'enc:'

function randomId(): string {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
}

function sanitizeRecord(value: unknown): Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}
  const out: Record<string, string> = {}
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (typeof val === 'string') out[key] = val
  }
  return out
}

/**
 * JSON persistence for the CloserAI-managed MCP server registry. Stored in the
 * app userData (not the DSH home), so it works identically in system-sync and
 * managed modes and never touches the user's DSH settings. Exports the standard
 * `mcpServers` map for use by any MCP-compatible client (Claude Code, Kimi
 * Code, editors, DSH plugins).
 *
 * Security (REVIEW R-12): env / header VALUES are encrypted at rest with the
 * provided cipher (safeStorage in production) as `enc:<base64>`, and the
 * renderer-facing `list()` masks every value so secrets never reach the UI.
 * `read()` returns the decrypted view for internal consumers (e.g. export);
 * mutating operations always persist the encrypted form.
 */
export class McpStoreFile {
  private readonly filePath: string
  private readonly cipher: (() => SecretCipher) | null

  constructor(filePath: string, cipher?: () => SecretCipher) {
    this.filePath = filePath
    this.cipher = cipher ?? null
  }

  private encrypt(value: string): string {
    const cipher = this.cipher
    if (cipher === null) return value
    try {
      return ENC_PREFIX + cipher().encrypt(value).toString('base64')
    } catch {
      return value
    }
  }

  private decrypt(value: string): string {
    const cipher = this.cipher
    if (cipher === null || !value.startsWith(ENC_PREFIX)) return value
    try {
      return cipher().decrypt(Buffer.from(value.slice(ENC_PREFIX.length), 'base64'))
    } catch {
      return value
    }
  }

  private encryptRecord(record: Record<string, string>): Record<string, string> {
    return Object.fromEntries(Object.entries(record).map(([k, v]) => [k, this.encrypt(v)]))
  }

  private decryptRecord(record: Record<string, string> | undefined): Record<string, string> {
    if (record === undefined) return {}
    return Object.fromEntries(Object.entries(record).map(([k, v]) => [k, this.decrypt(v)]))
  }

  private maskRecord(record: Record<string, string> | undefined): Record<string, string> {
    if (record === undefined) return {}
    return Object.fromEntries(Object.keys(record).map((key) => [key, SECRET_MASK]))
  }

  private maskServer(server: McpServer): McpServer {
    return { ...server, env: this.maskRecord(server.env), headers: this.maskRecord(server.headers) }
  }

  /**
   * Raw persistence view: exactly what is on disk (encrypted values when a
   * cipher is configured). Mutating operations must use this so untouched
   * servers keep their encrypted values.
   */
  private readRaw(): McpStoreData {
    try {
      const parsed: unknown = JSON.parse(readFileSync(this.filePath, 'utf8'))
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
        return { ...EMPTY_STORE }
      const store = parsed as Partial<McpStoreData>
      const servers = Array.isArray(store.servers) ? store.servers : []
      return { servers: servers.filter((s): s is McpServer => isMcpServer(s)) }
    } catch {
      // Missing file and any corrupt/unreadable content fall back to empty.
      return { ...EMPTY_STORE }
    }
  }

  /** Decrypted view for internal consumers (export / diagnostics). */
  read(): McpStoreData {
    const raw = this.readRaw()
    return {
      servers: raw.servers.map((server) => ({
        ...server,
        env: this.decryptRecord(server.env),
        headers: this.decryptRecord(server.headers),
      })),
    }
  }

  write(store: McpStoreData): void {
    mkdirSync(dirname(this.filePath), { recursive: true })
    writeFileSync(this.filePath, `${JSON.stringify(store, null, 2)}\n`, 'utf8')
  }

  /** Renderer-facing view: env/header values masked, never the real secrets. */
  list(): McpServer[] {
    return this.read().servers.map((server) => this.maskServer(server))
  }

  add(input: {
    name: string
    transport: McpServer['transport']
    description?: string
    command?: string
    args?: string[]
    env?: Record<string, string>
    url?: string
    headers?: Record<string, string>
  }): McpServer {
    const now = Date.now()
    const server: McpServer = {
      id: randomId(),
      name: input.name.trim() || '未命名 MCP 服务器',
      enabled: true,
      transport: input.transport,
      description: input.description?.trim() || undefined,
      command: input.command?.trim() || undefined,
      args: Array.isArray(input.args) ? input.args.map((a) => a.trim()).filter(Boolean) : [],
      env: this.encryptRecord(sanitizeRecord(input.env)),
      url: input.url?.trim() || undefined,
      headers: this.encryptRecord(sanitizeRecord(input.headers)),
      createdAt: now,
      updatedAt: now,
    }
    const store = this.readRaw()
    store.servers.push(server)
    this.write(store)
    return this.maskServer(server)
  }

  update(
    id: string,
    patch: {
      name?: string
      enabled?: boolean
      transport?: McpServer['transport']
      description?: string
      command?: string
      args?: string[]
      env?: Record<string, string>
      url?: string
      headers?: Record<string, string>
    },
  ): McpServer | null {
    const store = this.readRaw()
    const index = store.servers.findIndex((server) => server.id === id)
    if (index < 0) return null
    const current = store.servers[index]!
    const next: McpServer = {
      ...current,
      createdAt: current.createdAt,
      name: patch.name === undefined ? current.name : patch.name.trim() || current.name,
      enabled: patch.enabled ?? current.enabled,
      transport: patch.transport ?? current.transport,
      description:
        patch.description === undefined
          ? current.description
          : patch.description.trim() || undefined,
      command: patch.command === undefined ? current.command : patch.command.trim() || undefined,
      args:
        patch.args === undefined
          ? (current.args ?? [])
          : patch.args.map((a) => a.trim()).filter(Boolean),
      // A masked value from the edit form means "keep the stored secret".
      env:
        patch.env === undefined
          ? current.env
          : this.encryptRecord(
              mergeMasked(sanitizeRecord(patch.env), this.decryptRecord(current.env)),
            ),
      url: patch.url === undefined ? current.url : patch.url.trim() || undefined,
      headers:
        patch.headers === undefined
          ? current.headers
          : this.encryptRecord(
              mergeMasked(sanitizeRecord(patch.headers), this.decryptRecord(current.headers)),
            ),
      updatedAt: Date.now(),
    }
    store.servers[index] = next
    this.write(store)
    return this.maskServer(next)
  }

  remove(id: string): boolean {
    const store = this.readRaw()
    const before = store.servers.length
    store.servers = store.servers.filter((server) => server.id !== id)
    if (store.servers.length === before) return false
    this.write(store)
    return true
  }

  setEnabled(id: string, enabled: boolean): McpServer | null {
    return this.update(id, { enabled })
  }

  /** Standard `mcpServers` map (enabled servers only) for MCP-compatible clients. */
  toMcpJson(): Record<string, Record<string, unknown>> {
    const out: Record<string, Record<string, unknown>> = {}
    for (const server of this.read().servers) {
      if (!server.enabled) continue
      const entry: Record<string, unknown> = {}
      if (server.transport === 'http') {
        if (server.url) entry.url = server.url
        if (server.headers && Object.keys(server.headers).length > 0) entry.headers = server.headers
      } else {
        if (server.command) entry.command = server.command
        if (server.args && server.args.length > 0) entry.args = server.args
        if (server.env && Object.keys(server.env).length > 0) entry.env = server.env
      }
      if (Object.keys(entry).length > 0) out[server.name] = entry
    }
    return out
  }

  /** Resolve where the exported mcp.json lives for a chosen directory. */
  exportPath(destDir: string): string {
    return join(destDir, 'mcp.json')
  }
}

/** Apply a form patch, treating masked values as "keep the existing secret". */
function mergeMasked(
  patch: Record<string, string>,
  existing: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(patch)) {
    out[key] = value === SECRET_MASK ? (existing[key] ?? '') : value
  }
  return out
}

function isMcpServer(value: unknown): value is McpServer {
  if (typeof value !== 'object' || value === null) return false
  const server = value as McpServer
  return (
    typeof server.id === 'string' &&
    typeof server.name === 'string' &&
    typeof server.enabled === 'boolean' &&
    (server.transport === 'stdio' || server.transport === 'http')
  )
}
