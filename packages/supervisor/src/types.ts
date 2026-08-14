export type SupervisorState =
  'idle' | 'starting' | 'ready' | 'unhealthy' | 'stopping' | 'stopped' | 'failed'

export interface SupervisorStatus {
  state: SupervisorState
  /** The URL DSH printed on the ready line, or null before startup completes. */
  url: string | null
  /** The bound port, or null before startup completes. */
  port: number | null
  /** The child process id, or null when no child is running. */
  pid: number | null
  /** Consecutive restarts since the last successful ready. */
  restartCount: number
  /** Number of lines buffered for diagnostics. */
  logLineCount: number
}

export type LogStream = 'stdout' | 'stderr'

export interface SupervisorOptions {
  /** Executable to spawn. Defaults to `dsh`. */
  command?: string
  /** Arguments inserted right after `command` and before the `web` subcommand. */
  commandArgs?: string[]
  /** Resolve `command` through a shell. Defaults to false; prefer spawning
   * `node <dsh-bin.js>` (command = process.execPath) to avoid shell quoting
   * and the Node DEP0190 warning on Windows `.cmd` shims. */
  shell?: boolean
  /** Loopback host DSH binds. Defaults to `127.0.0.1`. */
  host?: string
  /** Port DSH binds; 0 lets the OS choose. Defaults to 0. */
  port?: number
  /** Extra arguments appended after `web --host <host> --port <port>`. */
  args?: string[]
  /** Value for DSH_HOME; omitted means inherit the environment. */
  home?: string
  /** Extra environment variables merged over the inherited environment. */
  env?: Record<string, string>
  /** How long to wait for the ready line before failing the start. */
  startupTimeoutMs?: number
  /** Interval between health probes while running. */
  healthIntervalMs?: number
  /** Consecutive failed probes before declaring the child unhealthy. */
  maxUnhealthyChecks?: number
  /** Base delay for crash-restart backoff. */
  restartBackoffMs?: number
  /** Maximum consecutive crash-restarts before giving up. */
  maxRestarts?: number
  /** How long a child must stay ready before the restart counter resets. */
  restartResetMs?: number
  /** How long to wait for a graceful exit before force-killing. */
  shutdownGraceMs?: number
}

export const DEFAULT_OPTIONS = {
  command: 'dsh',
  commandArgs: [],
  host: '127.0.0.1',
  port: 0,
  args: [],
  startupTimeoutMs: 30_000,
  healthIntervalMs: 5_000,
  maxUnhealthyChecks: 3,
  restartBackoffMs: 1_000,
  maxRestarts: 5,
  restartResetMs: 30_000,
  shutdownGraceMs: 5_000,
} as const

export type ResolvedOptions = Required<Omit<SupervisorOptions, 'home' | 'env' | 'shell'>> & {
  shell: boolean
  home?: string
  env: Record<string, string>
}
