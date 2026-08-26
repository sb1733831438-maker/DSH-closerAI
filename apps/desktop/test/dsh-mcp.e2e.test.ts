import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn, type SpawnOptions } from 'node:child_process'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startMockServer, type MockServer } from '@closerai/mock-provider'
import { resolveDshBin } from '../src/main/dsh.js'
import { mcpPatchPath, writeDshMcpPlugins } from '../src/main/dsh-mcp.js'
import type { McpServer } from '../src/shared/types.js'

/**
 * E2E proof of ROADMAP A-4: writing the MCP plugin rows into the headless
 * profile's cordis.patch.yml makes a real DSH boot spawn the MCP server and
 * (per dsh-mcp-client) register its tools. The fixture MCP server prints a
 * marker to stderr that DSH captures into its logs — if it appears, the
 * full mount chain works.
 */

const FIXTURE = fileURLToPath(new URL('./fixtures/mcp-test-server.mjs', import.meta.url))
const HEADLESS_TIMEOUT_MS = 120_000

let server: MockServer
let home: string

beforeAll(async () => {
  server = await startMockServer()
  home = mkdtempSync(join(tmpdir(), 'closerai-mcp-e2e-'))

  writeFileSync(
    join(home, 'settings.yaml'),
    [
      'llm-deepseek:',
      `  baseURL: ${server.url}/v1`,
      '  thinking: enabled',
      '  reasoningEffort: high',
      '  models:',
      '    - id: mock-model',
      '      contextWindow: 128000',
      'agent-presets:',
      '  default: chat',
      '',
    ].join('\n'),
    'utf8',
  )

  const mcpServer: McpServer = {
    id: 'e2e-1',
    name: 'fixture',
    enabled: true,
    transport: 'stdio',
    command: process.execPath,
    args: [FIXTURE],
    env: {},
    createdAt: 1,
    updatedAt: 1,
  }
  const injectEnv = writeDshMcpPlugins(home, [mcpServer])
  expect(injectEnv).not.toBeNull()
})

afterAll(async () => {
  await server.close()
  rmSync(home, { recursive: true, force: true })
})

function runHeadless(): Promise<{ status: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const options: SpawnOptions = {
      env: { ...process.env, DSH_HOME: home, DEEPSEEK_API_KEY: 'mock-key' },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
    const child = spawn(
      process.execPath,
      ['--expose-internals', resolveDshBin(), '--profile', 'headless', 'reply with exactly: ok'],
      options,
    )
    let stdout = ''
    let stderr = ''
    child.stdout!.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8')
    })
    child.stderr!.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
    })
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error(`headless timed out\nstderr: ${stderr.slice(0, 500)}`))
    }, HEADLESS_TIMEOUT_MS)
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.on('exit', (status) => {
      clearTimeout(timer)
      resolve({ status, stdout, stderr })
    })
  })
}

describe('MCP runtime mounting (ROADMAP A-4)', () => {
  it(
    'boots DSH with the mounted MCP server and spawns it (tools register)',
    async () => {
      const run = await runHeadless()
      expect(run.status).toBe(0)
      if (run.status !== 0) {
        throw new Error(`headless exited ${run.status} stderr=${run.stderr.slice(0, 600)}`)
      }
      // The dsh-mcp-client plugin loaded from the patch and spawned the
      // fixture server; its marker lands in DSH's captured stderr.
      const combined = run.stdout + run.stderr
      expect(combined).toContain('[mcp-fixture] server ready')
    },
    HEADLESS_TIMEOUT_MS + 10_000,
  )

  it('keeps the MCP rows in the patch after a boot (no clobber)', async () => {
    const patch = await import('node:fs/promises').then((fs) =>
      fs.readFile(mcpPatchPath(home), 'utf8'),
    )
    expect(patch).toContain('@deepseek-ai/dsh-mcp-client')
    expect(patch).toContain('id: mcp-fixture')
  })
})
