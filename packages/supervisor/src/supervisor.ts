import { EventEmitter } from 'node:events'
import { spawn, type ChildProcess } from 'node:child_process'
import { createInterface, type Interface } from 'node:readline'
import type { Readable } from 'node:stream'
import {
  DEFAULT_OPTIONS,
  type LogStream,
  type ResolvedOptions,
  type SupervisorOptions,
  type SupervisorState,
  type SupervisorStatus,
} from './types.js'
import { parseDshUrl, urlToHostPort } from './url.js'
import { tcpProbe } from './health.js'
import { LogBuffer } from './log-buffer.js'

function resolveOptions(options: SupervisorOptions): ResolvedOptions {
  return {
    command: options.command ?? DEFAULT_OPTIONS.command,
    commandArgs: options.commandArgs ?? [],
    shell: options.shell ?? false,
    host: options.host ?? DEFAULT_OPTIONS.host,
    port: options.port ?? DEFAULT_OPTIONS.port,
    args: options.args ?? [],
    home: options.home,
    cwd: options.cwd,
    env: options.env ?? {},
    startupTimeoutMs: options.startupTimeoutMs ?? DEFAULT_OPTIONS.startupTimeoutMs,
    healthIntervalMs: options.healthIntervalMs ?? DEFAULT_OPTIONS.healthIntervalMs,
    maxUnhealthyChecks: options.maxUnhealthyChecks ?? DEFAULT_OPTIONS.maxUnhealthyChecks,
    restartBackoffMs: options.restartBackoffMs ?? DEFAULT_OPTIONS.restartBackoffMs,
    maxRestarts: options.maxRestarts ?? DEFAULT_OPTIONS.maxRestarts,
    restartResetMs: options.restartResetMs ?? DEFAULT_OPTIONS.restartResetMs,
    shutdownGraceMs: options.shutdownGraceMs ?? DEFAULT_OPTIONS.shutdownGraceMs,
  }
}

interface PendingStart {
  resolve: (status: SupervisorStatus) => void
  reject: (error: Error) => void
}

/**
 * Supervises a DeepSeek Harness child process. It spawns `dsh web`, waits for
 * the ready line, health-checks the bound port, restarts on crash, and shuts
 * the child down gracefully on stop().
 */
export class DshSupervisor extends EventEmitter {
  private readonly options: ResolvedOptions
  private child: ChildProcess | null = null
  private state: SupervisorState = 'idle'
  private url: string | null = null
  private port: number | null = null
  private restartCount = 0
  private startPromise: Promise<SupervisorStatus> | null = null
  private pendingStart: PendingStart | null = null
  private stopPromise: Promise<void> | null = null
  private stopResolve: (() => void) | null = null
  private healthTimer: ReturnType<typeof setInterval> | null = null
  private restartTimer: ReturnType<typeof setTimeout> | null = null
  private startupTimer: ReturnType<typeof setTimeout> | null = null
  private stableTimer: ReturnType<typeof setTimeout> | null = null
  private consecutiveFailures = 0
  private runId = 0
  private stopping = false
  readonly logs = new LogBuffer()

  constructor(options: SupervisorOptions = {}) {
    super()
    this.options = resolveOptions(options)
  }

  get status(): SupervisorStatus {
    return {
      state: this.state,
      url: this.url,
      port: this.port,
      pid: this.child?.pid ?? null,
      restartCount: this.restartCount,
      logLineCount: this.logs.size,
    }
  }

  getState(): SupervisorState {
    return this.state
  }

  getUrl(): string | null {
    return this.url
  }

  getPort(): number | null {
    return this.port
  }

  getPid(): number | null {
    return this.child?.pid ?? null
  }

  /** Start (or restart from a stopped/failed state) the child and await readiness. */
  async start(): Promise<SupervisorStatus> {
    if (this.state === 'ready') return this.status
    if (this.startPromise !== null) return this.startPromise
    // Wait for an in-flight stop() to fully finish so the port is released and
    // no second child spawns while the old one is still shutting down (R-27).
    if (this.stopPromise !== null) await this.stopPromise
    if (this.getState() === 'ready') return this.status
    if (this.startPromise !== null) return this.startPromise

    // A pending auto-restart timer must not double-spawn: start() replaces the
    // child immediately, so cancel the scheduled restart (R-27).
    this.clearRestartTimer()
    this.restartCount = 0
    this.startPromise = new Promise<SupervisorStatus>((resolve, reject) => {
      this.pendingStart = { resolve, reject }
    })
    this.spawnChild()
    return this.startPromise
  }

  /** Gracefully stop the child. Resolves when the process has exited. */
  async stop(): Promise<void> {
    if (this.stopPromise !== null) return this.stopPromise
    this.stopPromise = new Promise<void>((resolve) => {
      this.stopResolve = resolve
    })

    this.stopping = true
    this.clearHealthMonitor()
    this.clearRestartTimer()
    this.clearStableTimer()
    if (this.startupTimer !== null) {
      clearTimeout(this.startupTimer)
      this.startupTimer = null
    }
    if (this.startPromise !== null) {
      this.settleStart(new Error('stopped before DSH became ready'))
    }

    if (this.child !== null) {
      const child = this.child
      this.setState('stopping')
      const grace = setTimeout(() => {
        if (this.child === child) child.kill('SIGKILL')
      }, this.options.shutdownGraceMs)
      child.once('exit', () => clearTimeout(grace))
      child.kill('SIGTERM')
    } else {
      this.finishStop()
    }

    return this.stopPromise
  }

  // ── internals ──────────────────────────────────────────────────────────────

  private setState(state: SupervisorState): void {
    if (this.state === state) return
    this.state = state
    this.emit('state', state, this.status)
  }

  private spawnChild(): void {
    this.clearRestartTimer()
    this.runId += 1
    const runId = this.runId
    this.stopping = false
    this.url = null
    this.port = null
    this.consecutiveFailures = 0
    this.clearStableTimer()
    this.setState('starting')

    const args = [
      ...this.options.commandArgs,
      'web',
      '--host',
      this.options.host,
      '--port',
      String(this.options.port),
      ...this.options.args,
    ]
    const env: NodeJS.ProcessEnv = { ...process.env, ...this.options.env }
    if (this.options.home !== undefined) env.DSH_HOME = this.options.home
    if (this.options.cwd !== undefined) env.DSH_CWD = this.options.cwd

    const child = spawn(this.options.command, args, {
      shell: this.options.shell,
      cwd: this.options.cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    this.child = child

    this.attachStream(child.stdout, 'stdout', runId)
    this.attachStream(child.stderr, 'stderr', runId)

    child.once('error', (error) => this.handleSpawnError(runId, error))
    child.once('exit', (code, signal) => this.handleExit(runId, code, signal))

    this.startupTimer = setTimeout(() => {
      if (runId !== this.runId || this.state !== 'starting') return
      const error = new Error(
        `DSH failed to become ready within ${this.options.startupTimeoutMs}ms`,
      )
      this.forceKill()
      this.setState('failed')
      this.emit('failed', error, this.status)
      this.settleStart(error)
    }, this.options.startupTimeoutMs)
  }

  private attachStream(stream: Readable | null, name: LogStream, runId: number): void {
    if (stream === null) return
    const rl: Interface = createInterface({ input: stream, crlfDelay: Infinity })
    rl.on('line', (line) => {
      this.logs.push(name, line)
      this.emit('log', line, name)
      if (runId !== this.runId || name !== 'stdout') return
      const url = parseDshUrl(line)
      if (url !== null && this.state === 'starting') this.onReady(runId, url)
    })
  }

  private onReady(runId: number, url: string): void {
    if (runId !== this.runId) return
    const endpoint = urlToHostPort(url)
    if (endpoint === null) return
    this.url = url
    this.port = endpoint.port
    this.consecutiveFailures = 0
    if (this.startupTimer !== null) {
      clearTimeout(this.startupTimer)
      this.startupTimer = null
    }
    this.setState('ready')
    this.startHealthMonitor()
    this.scheduleRestartReset(runId)
    this.emit('ready', this.status)
    this.settleStart(null)
  }

  private scheduleRestartReset(runId: number): void {
    this.clearStableTimer()
    this.stableTimer = setTimeout(() => {
      if (runId === this.runId && this.state === 'ready') {
        this.restartCount = 0
      }
    }, this.options.restartResetMs)
  }

  private startHealthMonitor(): void {
    this.clearHealthMonitor()
    const runId = this.runId
    const host = this.options.host
    this.healthTimer = setInterval(() => {
      if (runId !== this.runId || this.state !== 'ready' || this.port === null) return
      const port = this.port
      void tcpProbe(host, port, Math.min(2000, this.options.healthIntervalMs)).then((ok) => {
        if (runId !== this.runId || this.state !== 'ready') return
        if (ok) {
          this.consecutiveFailures = 0
        } else {
          this.consecutiveFailures += 1
          if (this.consecutiveFailures >= this.options.maxUnhealthyChecks) {
            this.markUnhealthy(runId)
          }
        }
      })
    }, this.options.healthIntervalMs)
  }

  private markUnhealthy(runId: number): void {
    if (runId !== this.runId || this.state !== 'ready') return
    this.setState('unhealthy')
    this.emit('unhealthy', this.status)
    this.forceKill() // the exit handler decides whether to restart
  }

  private handleSpawnError(runId: number, error: Error): void {
    if (runId !== this.runId) return
    this.child = null
    this.clearStableTimer()
    if (this.startupTimer !== null) {
      clearTimeout(this.startupTimer)
      this.startupTimer = null
    }
    this.setState('failed')
    this.emit('failed', error, this.status)
    this.settleStart(error)
  }

  private handleExit(runId: number, code: number | null, signal: NodeJS.Signals | null): void {
    if (runId !== this.runId) return
    this.child = null
    this.clearHealthMonitor()
    this.clearStableTimer()
    if (this.startupTimer !== null) {
      clearTimeout(this.startupTimer)
      this.startupTimer = null
    }

    this.emit('exit', code, signal)

    if (this.stopping || this.state === 'stopping') {
      this.finishStop()
      return
    }

    if (this.state === 'starting') {
      const error = new Error(`DSH exited before ready (code=${code}, signal=${signal ?? 'none'})`)
      this.setState('failed')
      this.emit('failed', error, this.status)
      this.settleStart(error)
      return
    }

    // Only a child that had been ready (direct crash) or was killed as
    // unhealthy is eligible for restart; every other terminal state stays put.
    if (this.state !== 'ready' && this.state !== 'unhealthy') return

    if (this.restartCount < this.options.maxRestarts) {
      this.restartCount += 1
      const delay = this.options.restartBackoffMs * 2 ** (this.restartCount - 1)
      this.setState('unhealthy')
      this.emit('restart', this.restartCount, delay)
      this.restartTimer = setTimeout(() => {
        this.restartTimer = null
        this.spawnChild()
      }, delay)
      return
    }

    const error = new Error(`DSH crashed and exceeded max restarts (${this.options.maxRestarts})`)
    this.setState('failed')
    this.emit('failed', error, this.status)
  }

  private forceKill(): void {
    const child = this.child
    if (child !== null) child.kill('SIGKILL')
  }

  private finishStop(): void {
    this.child = null
    this.stopping = false
    this.setState('stopped')
    this.stopResolve?.()
    this.stopResolve = null
    this.stopPromise = null
  }

  private settleStart(error: Error | null): void {
    const pending = this.pendingStart
    this.pendingStart = null
    this.startPromise = null
    if (pending !== null) {
      if (error !== null) pending.reject(error)
      else pending.resolve(this.status)
    }
  }

  private clearHealthMonitor(): void {
    if (this.healthTimer !== null) {
      clearInterval(this.healthTimer)
      this.healthTimer = null
    }
  }

  private clearRestartTimer(): void {
    if (this.restartTimer !== null) {
      clearTimeout(this.restartTimer)
      this.restartTimer = null
    }
  }

  private clearStableTimer(): void {
    if (this.stableTimer !== null) {
      clearTimeout(this.stableTimer)
      this.stableTimer = null
    }
  }
}

export type { SupervisorOptions, SupervisorState, SupervisorStatus }
