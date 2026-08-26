import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { DshSupervisor, tcpProbe, type SupervisorOptions } from '../src/index.js'

const fakeDshPath = fileURLToPath(new URL('./fixtures/fake-dsh.mjs', import.meta.url))

const created: DshSupervisor[] = []

function makeSupervisor(extra: SupervisorOptions = {}): DshSupervisor {
  const supervisor = new DshSupervisor({
    command: process.execPath,
    commandArgs: [fakeDshPath],
    shell: false,
    host: '127.0.0.1',
    port: 0,
    startupTimeoutMs: 5000,
    healthIntervalMs: 80,
    maxUnhealthyChecks: 2,
    restartBackoffMs: 20,
    maxRestarts: 3,
    shutdownGraceMs: 1000,
    ...extra,
  })
  created.push(supervisor)
  return supervisor
}

async function waitForState(
  supervisor: DshSupervisor,
  state: string,
  timeoutMs = 5000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (supervisor.getState() === state) return
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  throw new Error(`timed out waiting for state "${state}" (currently "${supervisor.getState()}")`)
}

async function waitFor(predicate: () => boolean, timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  throw new Error('timed out waiting for condition')
}

afterEach(async () => {
  for (const supervisor of created.splice(0)) {
    await supervisor.stop()
  }
})

describe('DshSupervisor', () => {
  it('starts a child and resolves with the parsed URL', async () => {
    const supervisor = makeSupervisor()
    const status = await supervisor.start()
    expect(status.state).toBe('ready')
    expect(status.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/)
    expect(status.port).toBeGreaterThan(0)
    expect(status.pid).toBeGreaterThan(0)

    const reachable = await tcpProbe('127.0.0.1', status.port!, 1000)
    expect(reachable).toBe(true)

    await supervisor.stop()
    expect(supervisor.getState()).toBe('stopped')
    expect(supervisor.getPid()).toBeNull()
  })

  it('buffers child output for diagnostics', async () => {
    const supervisor = makeSupervisor()
    await supervisor.start()
    const hasReadyLine = supervisor.logs.entries().some((entry) => entry.text.includes('dsh web:'))
    expect(hasReadyLine).toBe(true)
  })

  it('restarts on crash and eventually fails past maxRestarts', async () => {
    const supervisor = makeSupervisor({
      env: { FAKE_DSH_CRASH_AFTER_MS: '200' },
      maxRestarts: 2,
    })
    const restarts: number[] = []
    let failedError: Error | null = null
    supervisor.on('restart', (attempt) => restarts.push(attempt))
    supervisor.on('failed', (error: Error) => {
      failedError = error
    })

    const status = await supervisor.start()
    expect(status.state).toBe('ready')

    await waitForState(supervisor, 'failed', 8000)
    expect(restarts).toEqual([1, 2])
    expect(failedError).not.toBeNull()
    expect(failedError!.message).toContain('max restarts')
  }, 15000)

  it('rejects start() when the child never becomes ready', async () => {
    const supervisor = makeSupervisor({
      env: { FAKE_DSH_NO_READY: '1' },
      startupTimeoutMs: 300,
    })
    await expect(supervisor.start()).rejects.toThrow(/ready/)
    expect(supervisor.getState()).toBe('failed')
  })

  it('marks the child unhealthy when its port stops answering and restarts it', async () => {
    const supervisor = makeSupervisor({
      env: { FAKE_DSH_CLOSE_SERVER_AFTER_MS: '100' },
      maxRestarts: 3,
    })
    const unhealthy: boolean[] = []
    supervisor.on('unhealthy', () => unhealthy.push(true))

    await supervisor.start()
    await waitFor(() => unhealthy.length > 0 && supervisor.getState() === 'ready', 8000)
    expect(unhealthy.length).toBeGreaterThan(0)
  }, 15000)

  it('R-27: start() during an in-flight stop() waits instead of spawning a second child', async () => {
    const supervisor = makeSupervisor()
    await supervisor.start()

    const stopPromise = supervisor.stop()
    // start() must await the pending stop (releasing the port) rather than
    // spawning a second child that would race the shutting-down one.
    const startPromise = supervisor.start()
    const status = await startPromise
    await stopPromise

    expect(status.state).toBe('ready')
    expect(supervisor.getState()).toBe('ready')
    expect(supervisor.getPid()).not.toBeNull()
    await supervisor.stop()
  }, 15000)

  it('R-27: start() during a pending auto-restart does not double-spawn', async () => {
    // The env object is passed to every spawn by reference; neutralize the
    // crash switch before re-starting so only the FIRST child crashes.
    const env: Record<string, string> = { FAKE_DSH_CRASH_AFTER_MS: '100' }
    const supervisor = makeSupervisor({ env, restartBackoffMs: 300, maxRestarts: 5 })
    await supervisor.start()
    // crash -> restart timer scheduled -> state 'unhealthy'
    await waitForState(supervisor, 'unhealthy', 8000)
    env.FAKE_DSH_CRASH_AFTER_MS = '0'

    const readyEvents: string[] = []
    supervisor.on('ready', (s) => readyEvents.push(s.url ?? ''))
    await supervisor.start()
    await waitFor(() => supervisor.getState() === 'ready', 8000)
    // The cancelled timer (first crash + backoff = 400ms) would have fired
    // within this window if start() had not cleared it; the re-started child
    // no longer crashes, so a second ready event means a double-spawn.
    await new Promise((resolve) => setTimeout(resolve, 800))
    expect(readyEvents).toHaveLength(1)
    expect(supervisor.getState()).toBe('ready')
    await supervisor.stop()
  }, 15000)
})
