import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import yaml from 'js-yaml'
import type { ProviderProfile } from './providers.js'
import { toDshSettings } from './providers.js'

/**
 * Write DSH's `llm-deepseek` settings section. The profile carries the
 * endpoint and model catalog; the API key is injected separately through the
 * launching environment and never lands in this file.
 */
export function writeDshProviderSettings(settingsPath: string, profile: ProviderProfile): void {
  let root: Record<string, unknown> = {}
  try {
    const parsed: unknown = yaml.load(readFileSync(settingsPath, 'utf8'))
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      root = parsed as Record<string, unknown>
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  root['llm-deepseek'] = toDshSettings(profile)
  mkdirSync(dirname(settingsPath), { recursive: true })
  writeFileSync(settingsPath, yaml.dump(root, { lineWidth: 120 }), 'utf8')
}
