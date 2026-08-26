import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { McpStoreFile } from '../src/main/mcp-store.js'
import type { SecretCipher } from '../src/main/secrets.js'

// Each test builds its own store on a fresh temp path so tests never share
// module-level state (this environment's vitest hook scheduling was racing).
const dirs: string[] = []

const fakeCipher: SecretCipher = {
  encrypt: (plaintext) => Buffer.from(`c!${plaintext}!c`, 'utf8'),
  decrypt: (ciphertext) => {
    const text = ciphertext.toString('utf8')
    if (!text.startsWith('c!') || !text.endsWith('!c')) throw new Error('bad ciphertext')
    return text.slice(2, -2)
  },
}

function makeStore(opts?: { cipher?: boolean }): { store: McpStoreFile; file: string } {
  const dir = mkdtempSync(join(tmpdir(), 'closerai-mcp-'))
  dirs.push(dir)
  const file = join(dir, 'mcp-servers.json')
  const store = new McpStoreFile(file, opts?.cipher === true ? () => fakeCipher : undefined)
  store.write({ servers: [] })
  return { store, file }
}
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('McpStoreFile', () => {
  it('returns empty defaults when the file does not exist', () => {
    const { store } = makeStore()
    expect(store.read()).toEqual({ servers: [] })
    expect(store.list()).toEqual([])
    expect(store.toMcpJson()).toEqual({})
  })

  it('adds a stdio server and persists it', () => {
    const { store, file } = makeStore()
    const server = store.add({
      name: 'filesystem',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem'],
      env: { FOO: 'bar' },
    })
    expect(server.id).toBeTruthy()
    expect(server.enabled).toBe(true)
    expect(store.list()).toHaveLength(1)
    // re-open from disk
    const reopened = new McpStoreFile(file)
    const reopenedServer = reopened.list()[0]!
    expect(reopenedServer.name).toBe('filesystem')
    expect(reopenedServer.command).toBe('npx')
  })

  it('adds an http server and updates it', () => {
    const { store } = makeStore()
    const server = store.add({
      name: 'openviking',
      transport: 'http',
      url: 'http://127.0.0.1:1933/mcp',
      headers: { Authorization: 'Bearer x' },
    })
    const updated = store.update(server.id, { url: 'http://127.0.0.1:1934/mcp' })
    expect(updated?.url).toBe('http://127.0.0.1:1934/mcp')
    // list() masks credential values from the renderer
    expect(store.list()[0]!.headers).toEqual({ Authorization: '***' })
  })

  it('updating an unknown id returns null', () => {
    const { store } = makeStore()
    expect(store.update('nope', { name: 'x' })).toBeNull()
  })

  it('removes a server and reports false for unknown ids', () => {
    const { store } = makeStore()
    const server = store.add({ name: 'temp', transport: 'stdio', command: 'node' })
    expect(store.remove(server.id)).toBe(true)
    expect(store.remove(server.id)).toBe(false)
    expect(store.list()).toHaveLength(0)
  })

  it('toggles enabled state', () => {
    const { store } = makeStore()
    const server = store.add({ name: 'temp', transport: 'stdio', command: 'node' })
    const disabled = store.setEnabled(server.id, false)
    expect(disabled?.enabled).toBe(false)
    expect(store.toMcpJson()).toEqual({})
  })

  it('exports only enabled servers in the standard mcpServers map', () => {
    const { store } = makeStore()
    store.add({ name: 'fs', transport: 'stdio', command: 'npx', args: ['-y', 'x'] })
    const http = store.add({ name: 'remote', transport: 'http', url: 'http://h/mcp' })
    store.setEnabled(http.id, false)
    const json = store.toMcpJson()
    expect(Object.keys(json)).toEqual(['fs'])
    expect(json.fs).toEqual({ command: 'npx', args: ['-y', 'x'] })
  })

  it('tolerates a corrupt file by falling back to defaults', () => {
    const { store, file } = makeStore()
    writeFileSync(file, '{ not json', 'utf8')
    expect(store.read()).toEqual({ servers: [] })
  })

  it('persists the exact JSON for an empty registry', () => {
    const { store, file } = makeStore()
    store.write({ servers: [] })
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual({ servers: [] })
  })

  it('R-12: masks env/header values in the renderer-facing list()', () => {
    const { store } = makeStore()
    store.add({
      name: 'svc',
      transport: 'http',
      url: 'http://h/mcp',
      headers: { Authorization: 'Bearer hunter2', 'X-Other': 'visible' },
      env: { TOKEN: 'secret-value' },
    })
    const listed = store.list()[0]!
    expect(listed.headers).toEqual({ Authorization: '***', 'X-Other': '***' })
    expect(listed.env).toEqual({ TOKEN: '***' })
    // the decrypted view still holds the real values for export
    expect(store.read().servers[0]!.headers!.Authorization).toBe('Bearer hunter2')
    expect(store.toMcpJson().svc).toEqual({
      url: 'http://h/mcp',
      headers: { Authorization: 'Bearer hunter2', 'X-Other': 'visible' },
    })
  })

  it('R-12: encrypts credential values at rest when a cipher is configured', () => {
    const { store, file } = makeStore({ cipher: true })
    store.add({
      name: 'svc',
      transport: 'http',
      url: 'http://h/mcp',
      headers: { Authorization: 'Bearer hunter2' },
    })
    const raw = readFileSync(file, 'utf8')
    expect(raw).not.toContain('hunter2')
    expect(raw).toContain('enc:')
    // decrypt round-trips through the internal view
    expect(store.read().servers[0]!.headers!.Authorization).toBe('Bearer hunter2')
    expect(store.toMcpJson().svc?.headers).toEqual({ Authorization: 'Bearer hunter2' })
  })

  it('R-12: an update with a masked value keeps the stored secret', () => {
    const { store } = makeStore({ cipher: true })
    const server = store.add({
      name: 'svc',
      transport: 'http',
      url: 'http://h/mcp',
      headers: { Authorization: 'Bearer hunter2' },
    })
    // the form submits the masked value for unchanged fields
    const updated = store.update(server.id, {
      url: 'http://h/mcp2',
      headers: { Authorization: '***' },
    })
    expect(updated?.url).toBe('http://h/mcp2')
    expect(store.read().servers[0]!.headers!.Authorization).toBe('Bearer hunter2')
    // changing the value replaces it
    store.update(server.id, { headers: { Authorization: 'Bearer newsecret' } })
    expect(store.read().servers[0]!.headers!.Authorization).toBe('Bearer newsecret')
  })

  it('R-12: legacy plaintext records stay readable (backward compatible)', () => {
    const { store, file } = makeStore()
    store.add({
      name: 'legacy',
      transport: 'http',
      url: 'http://h/mcp',
      headers: { Authorization: 'Bearer old' },
    })
    // reopen with a cipher configured: plaintext values are not `enc:` prefixed
    // so they pass through, and list() still masks them from the renderer.
    const reopened = new McpStoreFile(file, () => fakeCipher)
    expect(reopened.read().servers[0]!.headers!.Authorization).toBe('Bearer old')
    expect(reopened.list()[0]!.headers).toEqual({ Authorization: '***' })
  })
})
