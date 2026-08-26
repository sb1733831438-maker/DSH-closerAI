import { readFileSync } from 'node:fs'
import { atomicWriteFileSync } from './fs-atomic.js'
import type { AppConfig, Mode } from '../shared/types.js'

const DEFAULT_CONFIG: AppConfig = { mode: 'chat', workspaceDir: null, launchAtLogin: false }

function isMode(value: unknown): value is Mode {
  return value === 'chat' || value === 'work' || value === 'code'
}

/** JSON persistence for the active mode and the authorized workspace. */
export class AppConfigStore {
  private readonly filePath: string

  constructor(filePath: string) {
    this.filePath = filePath
  }

  read(): AppConfig {
    try {
      const parsed: unknown = JSON.parse(readFileSync(this.filePath, 'utf8'))
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
        return { ...DEFAULT_CONFIG }
      const record = parsed as Record<string, unknown>
      const mode = isMode(record.mode) ? record.mode : DEFAULT_CONFIG.mode
      const workspaceDir = typeof record.workspaceDir === 'string' ? record.workspaceDir : null
      const launchAtLogin = typeof record.launchAtLogin === 'boolean' ? record.launchAtLogin : false
      return { mode, workspaceDir, launchAtLogin }
    } catch {
      // Missing file, unreadable, or corrupt content all self-heal to the
      // defaults instead of crashing the app (REVIEW R-03).
      return { ...DEFAULT_CONFIG }
    }
  }

  write(config: AppConfig): void {
    atomicWriteFileSync(this.filePath, `${JSON.stringify(config, null, 2)}\n`)
  }
}
