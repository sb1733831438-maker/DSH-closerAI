import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn, type SpawnOptions } from 'node:child_process'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startMockServer, type MockServer } from '@closerai/mock-provider'
import { resolveDshBin } from '../src/main/dsh.js'

// End-to-end persistence check: a DSH headless run against the local mock
// provider must create a durable session record under DSH_HOME/sessions, which
// is what lets a restarted app resume prior conversations.
//
// NOTE: use async spawn + the 'exit' event, never spawnSync. DSH profile boot
// spawns pnpm grandchildren that inherit the stdout pipe, so spawnSync waits
// for stdout EOF that never comes (deadlock on Windows, ETIMEDOUT after the
// timeout). The 'exit' event fires when the direct child terminates, so an
// async child is both correct and fast.
let server: MockServer
let home: string

const HEADLESS_TIMEOUT_MS = 120_000

beforeAll(async () => {
  server = await startMockServer()
  home = mkdtempSync(join(tmpdir(), 'closerai-persist-'))

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
})

afterAll(async () => {
  await server.close()
  rmSync(home, { recursive: true, force: true })
})

function runHeadless(): Promise<{
  status: number | null
  signal: NodeJS.Signals | null
  stdout: string
  stderr: string
}> {
  return new Promise((resolve, reject) => {
    const options: SpawnOptions = {
      env: { ...process.env, DSH_HOME: home, DEEPSEEK_API_KEY: 'mock-key' },
      // stdin ignored: DSH headless must not wait on a TTY, and leaving the
      // pipe open would risk the same EOF deadlock family.
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
      reject(
        new Error(
          `headless run timed out after ${HEADLESS_TIMEOUT_MS}ms\nstdout: ${stdout.slice(0, 500)}\nstderr: ${stderr.slice(0, 500)}`,
        ),
      )
    }, HEADLESS_TIMEOUT_MS)
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.on('exit', (status, signal) => {
      clearTimeout(timer)
      resolve({ status, signal, stdout, stderr })
    })
  })
}

function sessionRecords(): string[] {
  const sessionsDir = join(home, 'sessions')
  try {
    return readdirSync(sessionsDir, { recursive: true, encoding: 'utf8' })
  } catch {
    return []
  }
}

describe('DSH session persistence', () => {
  it(
    'creates a durable session record under DSH_HOME after a run',
    async () => {
      const run = await runHeadless()
      expect(run.status).toBe(0)
      if (run.status !== 0) {
        throw new Error(
          `headless exited ${run.status ?? run.signal} stdout=${run.stdout} stderr=${run.stderr}`,
        )
      }

      const records = sessionRecords()
      expect(records.length).toBeGreaterThan(0)
      expect(records.some((name) => name.endsWith('.jsonl.zstd'))).toBe(true)
    },
    HEADLESS_TIMEOUT_MS + 10_000,
  )

  it(
    'keeps prior session records across a second run (restart recovery)',
    async () => {
      const first = await runHeadless()
      expect(first.status).toBe(0)
      const firstRecords = sessionRecords().filter((name) => name.endsWith('.jsonl.zstd'))
      expect(firstRecords.length).toBeGreaterThan(0)

      const second = await runHeadless()
      expect(second.status).toBe(0)
      const secondRecords = sessionRecords().filter((name) => name.endsWith('.jsonl.zstd'))
      // the first run's records are still present after the restart
      for (const name of firstRecords) expect(secondRecords).toContain(name)
    },
    HEADLESS_TIMEOUT_MS * 2 + 10_000,
  )
})
