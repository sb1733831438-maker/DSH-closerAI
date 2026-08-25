import { existsSync, readFileSync, rmSync } from 'node:fs'
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

function defaultIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

/**
 * Remove a stale task-board ledger lock when its owning process is dead.
 * The @linxin666/dsh-client-ui-task-board plugin refuses to boot a second DSH
 * on the same home while the lock file exists, even after a crash; this lets
 * CloserAI self-heal and retry instead of bricking the user's web DSH.
 * Returns true when a stale lock was removed.
 */
export async function clearStaleTaskBoardLock(
  dshHome: string,
  isAlive: (pid: number) => boolean = defaultIsAlive,
): Promise<boolean> {
  const lockPath = join(dshHome, 'task-board', 'ledger-v2.lock')
  let raw: string
  try {
    raw = readFileSync(lockPath, 'utf8')
  } catch {
    return false // no lock file -> nothing to clear
  }
  let pid: number
  try {
    const parsed = JSON.parse(raw) as { pid?: unknown }
    pid = typeof parsed.pid === 'number' ? parsed.pid : Number(parsed.pid)
    if (!Number.isFinite(pid)) return false
  } catch {
    return false // corrupt lock -> leave it for manual handling
  }
  if (isAlive(pid)) return false // a live DSH host owns the home -> don't touch it
  try {
    rmSync(lockPath, { force: true })
    return true
  } catch {
    return false
  }
}
