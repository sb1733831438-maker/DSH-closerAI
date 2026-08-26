import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { McpServer, McpStoreData } from '../shared/types.js'

const EMPTY_STORE: McpStoreData = { servers: [] }

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
 */
export class McpStoreFile {
  private readonly filePath: string

  constructor(filePath: string) {
    this.filePath = filePath
  }

  read(): McpStoreData {
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

  write(store: McpStoreData): void {
    mkdirSync(dirname(this.filePath), { recursive: true })
    writeFileSync(this.filePath, `${JSON.stringify(store, null, 2)}\n`, 'utf8')
  }

  list(): McpServer[] {
    return this.read().servers
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
      env: sanitizeRecord(input.env),
      url: input.url?.trim() || undefined,
      headers: sanitizeRecord(input.headers),
      createdAt: now,
      updatedAt: now,
    }
    const store = this.read()
    store.servers.push(server)
    this.write(store)
    return server
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
    const store = this.read()
    const index = store.servers.findIndex((server) => server.id === id)
    if (index < 0) return null
    const current = store.servers[index]!
    const next: McpServer = {
      ...current,
      createdAt: current.createdAt,
      name: patch.name !== undefined ? patch.name.trim() || current.name : current.name,
      enabled: patch.enabled ?? current.enabled,
      transport: patch.transport ?? current.transport,
      description:
        patch.description !== undefined
          ? patch.description.trim() || undefined
          : current.description,
      command: patch.command !== undefined ? patch.command.trim() || undefined : current.command,
      args:
        patch.args !== undefined
          ? patch.args.map((a) => a.trim()).filter(Boolean)
          : (current.args ?? []),
      env: patch.env !== undefined ? sanitizeRecord(patch.env) : current.env,
      url: patch.url !== undefined ? patch.url.trim() || undefined : current.url,
      headers: patch.headers !== undefined ? sanitizeRecord(patch.headers) : current.headers,
      updatedAt: Date.now(),
    }
    store.servers[index] = next
    this.write(store)
    return next
  }

  remove(id: string): boolean {
    const store = this.read()
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
    for (const server of this.list()) {
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
