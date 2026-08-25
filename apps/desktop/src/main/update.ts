import type { UpdateStatus } from '../shared/types.js'
/**
 * Auto-update controller wrapping electron-updater. The updater is injected
 * so the state machine is unit-testable without a real app; in production it
 * is the electron-updater autoUpdater (GitHub provider via latest.yml).
 */
export interface UpdaterLike {
  checkForUpdates(): Promise<unknown>
  downloadUpdate?(updateInfo?: unknown): Promise<unknown>
  quitAndInstall(): void
  on(event: string, listener: (...args: unknown[]) => void): unknown
}

export interface UpdateControllerDeps {
  updater: UpdaterLike
  /** Only packaged builds can self-update; dev/smoke report disabled. */
  isPackaged: () => boolean
}

export interface UpdateController {
  status(): UpdateStatus
  /** Check now and return the resulting status (events update it too). */
  check(): Promise<UpdateStatus>
  install(): Promise<UpdateStatus>
}

function versionOf(arg: unknown): string {
  const info = arg as { version?: string } | null
  return info?.version ?? 'unknown'
}

export function createUpdateController(deps: UpdateControllerDeps): UpdateController {
  let status: UpdateStatus = deps.isPackaged() ? { state: 'up-to-date' } : { state: 'disabled' }

  const { updater } = deps
  updater.on('checking-for-update', () => {
    status = { state: 'checking' }
  })
  updater.on('update-available', (arg: unknown) => {
    status = { state: 'available', version: versionOf(arg) }
  })
  updater.on('update-not-available', () => {
    status = { state: 'up-to-date' }
  })
  updater.on('download-progress', (arg: unknown) => {
    const p = arg as { percent?: number } | null
    status = { state: 'downloading', percent: p?.percent ?? 0 }
  })
  updater.on('update-downloaded', (arg: unknown) => {
    status = { state: 'downloaded', version: versionOf(arg) }
  })
  updater.on('error', (error: unknown) => {
    status = {
      state: 'error',
      message: error instanceof Error ? error.message : String(error),
    }
  })

  return {
    status: () => status,
    async check() {
      if (status.state === 'disabled') return status
      status = { state: 'checking' }
      try {
        await updater.checkForUpdates()
      } catch (error) {
        status = {
          state: 'error',
          message: error instanceof Error ? error.message : String(error),
        }
      }
      return status
    },
    async install() {
      if (status.state === 'downloaded') {
        updater.quitAndInstall()
        return { state: 'downloaded', version: status.version }
      }
      if (status.state === 'available' && updater.downloadUpdate !== undefined) {
        try {
          await updater.downloadUpdate()
        } catch (error) {
          status = {
            state: 'error',
            message: error instanceof Error ? error.message : String(error),
          }
        }
        return status
      }
      return status
    },
  }
}
