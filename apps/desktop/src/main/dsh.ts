import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { DshSupervisor } from '@closerai/supervisor'

/** Resolve the bundled `@deepseek-ai/dsh` CLI entry (lib/bin.js). */
export function resolveDshBin(): string {
  const require = createRequire(import.meta.url)
  const packageJson = require.resolve('@deepseek-ai/dsh/package.json')
  return join(dirname(packageJson), 'lib', 'bin.js')
}

export interface RunningDsh {
  supervisor: DshSupervisor
  url: string
}

/**
 * Start the supervised DSH child on a random loopback port and wait until its
 * web UI is ready. The child is spawned as `node <bundled dsh bin> web`, with
 * no shell, so Windows `.cmd` shims are never involved.
 */
export async function startDsh(home: string): Promise<RunningDsh> {
  const env: Record<string, string> = {}
  // Inside Electron, process.execPath is electron.exe. ELECTRON_RUN_AS_NODE
  // makes it behave as plain Node.js so the child runs dsh-bin.js as a script
  // rather than booting a second Electron application.
  if (process.versions.electron !== undefined) {
    env.ELECTRON_RUN_AS_NODE = '1'
  }

  const supervisor = new DshSupervisor({
    command: process.execPath,
    // --expose-internals: the web profile's HMR loader requires V8 internals;
    // Node >= 24.18 (Electron's bundled Node) enforces this at apply time.
    commandArgs: ['--expose-internals', resolveDshBin()],
    shell: false,
    host: '127.0.0.1',
    port: 0,
    home,
    env,
    startupTimeoutMs: 60_000,
  })

  const status = await supervisor.start()
  if (status.url === null) {
    throw new Error('DSH became ready without a URL')
  }
  return { supervisor, url: status.url }
}
