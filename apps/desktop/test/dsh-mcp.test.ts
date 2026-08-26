import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  managedProfileDir,
  mcpEnvVarName,
  mcpPatchPath,
  readPatch,
  writeDshMcpPlugins,
} from '../src/main/dsh-mcp.js'
import type { McpServer } from '../src/shared/types.js'

/**
 * ROADMAP A-4: mounting enabled MCP servers into the running DSH via the
 * headless profile's cordis.patch.yml (the non-forking DSH plugin surface).
 * Security invariant (R-12): credential values never land in the patch file;
 * they are injected through the DSH child environment as CLOSERAI_MCP_* vars
 * and referenced with `!!js process.env.*`.
 */

const dirs: string[] = []
function makeHome(): string {
  const dir = mkdtempSync(join(tmpdir(), 'closerai-mcp-mount-'))
  dirs.push(dir)
  return dir
}
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function stdioServer(over: Partial<McpServer> = {}): McpServer {
  return {
    id: 'srv-1',
    name: 'github',
    enabled: true,
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    env: { GITHUB_TOKEN: 'ghp_secret123' },
    createdAt: 1,
    updatedAt: 1,
    ...over,
  }
}

describe('writeDshMcpPlugins', () => {
  it('creates the headless profile patch with a row per enabled server', () => {
    const home = makeHome()
    const env = writeDshMcpPlugins(home, [stdioServer()])
    expect(env).not.toBeNull()

    const patch = readFileSync(mcpPatchPath(home), 'utf8')
    expect(patch).toContain("name: '@deepseek-ai/dsh-mcp-client'")
    expect(patch).toContain('serverName: github')
    expect(patch).toContain('transport: stdio')
    expect(patch).toContain('command: npx')
    expect(patch).toContain('id: mcp-github')
  })

  it('R-12: never writes credential values into the patch; injects them via env', () => {
    const home = makeHome()
    const env = writeDshMcpPlugins(home, [stdioServer()])!
    const patch = readFileSync(mcpPatchPath(home), 'utf8')
    expect(patch).not.toContain('ghp_secret123')
    expect(patch).toContain('!!js process.env.CLOSERAI_MCP_GITHUB_GITHUB_TOKEN')
    // the real secret only exists in the returned env map, passed to the child
    expect(env).toHaveProperty('CLOSERAI_MCP_GITHUB_GITHUB_TOKEN', 'ghp_secret123')
  })

  it('mounts http servers with streamable-http transport and header injection', () => {
    const home = makeHome()
    const server = stdioServer({
      id: 'srv-2',
      name: 'openviking',
      transport: 'http',
      url: 'http://127.0.0.1:1933/mcp',
      headers: { Authorization: 'Bearer tok123' },
    })
    const env = writeDshMcpPlugins(home, [server])!
    const patch = readFileSync(mcpPatchPath(home), 'utf8')
    expect(patch).toContain('transport: streamable-http')
    expect(patch).toContain('url: http://127.0.0.1:1933/mcp')
    expect(patch).toContain('!!js process.env.CLOSERAI_MCP_OPENVIKING_AUTHORIZATION')
    expect(patch).not.toContain('tok123')
    expect(env).toHaveProperty('CLOSERAI_MCP_OPENVIKING_AUTHORIZATION', 'Bearer tok123')
  })

  it('skips disabled servers', () => {
    const home = makeHome()
    writeDshMcpPlugins(home, [stdioServer({ id: 'srv-3', enabled: false })])
    const patch = readFileSync(mcpPatchPath(home), 'utf8')
    expect(patch).not.toContain('dsh-mcp-client')
    expect(patch.trim()).toBe('[]')
  })

  it('removes a dropped server on resync and preserves other rows', () => {
    const home = makeHome()
    const a = stdioServer({ id: 'a', name: 'alpha' })
    const b = stdioServer({ id: 'b', name: 'beta' })
    writeDshMcpPlugins(home, [a, b])
    expect(readFileSync(mcpPatchPath(home), 'utf8')).toContain('mcp-alpha')

    // drop alpha, keep beta
    writeDshMcpPlugins(home, [b])
    const patch = readFileSync(mcpPatchPath(home), 'utf8')
    expect(patch).not.toContain('mcp-alpha')
    expect(patch).toContain('mcp-beta')
  })

  it('preserves unrelated patch ops (e.g. a user plugin row)', () => {
    const home = makeHome()
    const patchPath = mcpPatchPath(home)
    mkdirSync(dirname(patchPath), { recursive: true })
    writeFileSync(
      patchPath,
      [
        '- insert:',
        '    - id: my-plugin',
        "      name: 'some-other-plugin'",
        '',
      ].join('\n'),
      'utf8',
    )
    writeDshMcpPlugins(home, [stdioServer()])
    const patch = readFileSync(patchPath, 'utf8')
    expect(patch).toContain('some-other-plugin')
    expect(patch).toContain('mcp-github')
  })

  it('returns null and does not rewrite an unreadable patch', () => {
    const home = makeHome()
    const patchPath = mcpPatchPath(home)
    mkdirSync(dirname(patchPath), { recursive: true })
    writeFileSync(patchPath, '{ not yaml [[[', 'utf8')
    const env = writeDshMcpPlugins(home, [stdioServer()])
    expect(env).toBeNull()
    expect(readFileSync(patchPath, 'utf8')).toBe('{ not yaml [[[')
  })

  it('sanitizes server names and deduplicates collisions', () => {
    const home = makeHome()
    const a = stdioServer({ id: 'a', name: 'My Server!' })
    const b = stdioServer({ id: 'b', name: 'my-server' })
    writeDshMcpPlugins(home, [a, b])
    const patch = readFileSync(mcpPatchPath(home), 'utf8')
    expect(patch).toContain('mcp-my-server')
    expect(patch).toContain('mcp-my-server-2')
  })

  it('readPatch returns an empty list for a missing file', () => {
    const home = makeHome()
    expect(readPatch(mcpPatchPath(home))).toEqual([])
  })

  it('mcpEnvVarName is deterministic and env-safe', () => {
    expect(mcpEnvVarName('My Server', 'x-api-key')).toBe(
      'CLOSERAI_MCP_MY_SERVER_X_API_KEY',
    )
  })
})

describe('managedProfileDir', () => {
  it('resolves the headless profile inside the home', () => {
    const home = makeHome()
    expect(managedProfileDir(home)).toBe(join(home, 'profiles', 'headless'))
    expect(mcpPatchPath(home)).toBe(
      join(home, 'profiles', 'headless', 'cordis.patch.yml'),
    )
  })
})
