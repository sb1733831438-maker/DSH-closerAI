import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
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
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { ...DEFAULT_CONFIG }
      throw error
    }
  }

  write(config: AppConfig): void {
    mkdirSync(dirname(this.filePath), { recursive: true })
    writeFileSync(this.filePath, `${JSON.stringify(config, null, 2)}\n`, 'utf8')
  }
}
