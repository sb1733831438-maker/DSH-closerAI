import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export type DshHomeMode = 'system-sync' | 'managed'

export interface DshHome {
  home: string
  mode: DshHomeMode
}

const SYSTEM_HOME = join(homedir(), '.dsh')

/**
 * Resolve the DSH home used by the desktop DSH child.
 *
 * - `CLOSERAI_DSH_HOME` set → that path. `CLOSERAI_DSH_MODE` may force
 *   `system-sync` (boot the user's own DSH untouched) or `managed`
 *   (CloserAI writes provider/preset settings). Tests and smoke use this.
 * - Otherwise, if the system DSH home (`~/.dsh`) exists → `system-sync`:
 *   the desktop boots the user's real DSH — same sessions, profiles,
 *   plugins and settings as their web DSH — and never overwrites its config.
 * - Otherwise → `<userData>/dsh-home`, `managed` (fresh-install fallback).
 */
export function resolveDshHome(userData: string, systemHome: string = SYSTEM_HOME): DshHome {
  const explicitHome = process.env.CLOSERAI_DSH_HOME
  if (explicitHome !== undefined && explicitHome.length > 0) {
    const explicitMode = process.env.CLOSERAI_DSH_MODE
    const mode: DshHomeMode =
      explicitMode === 'system-sync' || explicitMode === 'managed'
        ? explicitMode
        : explicitHome === systemHome
          ? 'system-sync'
          : 'managed'
    return { home: explicitHome, mode }
  }
  if (existsSync(systemHome)) {
    return { home: systemHome, mode: 'system-sync' }
  }
  return { home: join(userData, 'dsh-home'), mode: 'managed' }
}

/**
 * Map a DSH boot failure to a friendly, actionable Chinese message, or null
 * when it is not one of the known conditions. Used in system-sync mode so the
 * user gets a clear hint (e.g. "close the web DSH first") instead of a raw
 * crash report.
 */
export function describeDshStartFailure(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error)
  if (
    message.includes('task-board ledger is already owned by process') ||
    message.includes('already owned by process')
  ) {
    return '检测到另一个 DSH 正在使用同一 DSH 目录（很可能是你的 web 端 DSH 正在运行）。请先关闭它，再重新打开 CloserAI。'
  }
  return null
}
