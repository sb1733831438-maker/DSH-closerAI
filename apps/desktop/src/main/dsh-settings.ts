import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import yaml from 'js-yaml'
import type { Mode, ProviderProfile } from '../shared/types.js'
import { toDshSettings } from './providers.js'

function readDocument(settingsPath: string): Record<string, unknown> {
  try {
    const parsed: unknown = yaml.load(readFileSync(settingsPath, 'utf8'))
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  return {}
}

function writeSection(
  settingsPath: string,
  namespace: string,
  section: Record<string, unknown>,
): void {
  const root = readDocument(settingsPath)
  root[namespace] = section
  mkdirSync(dirname(settingsPath), { recursive: true })
  writeFileSync(settingsPath, yaml.dump(root, { lineWidth: 120 }), 'utf8')
}

/**
 * Write DSH's `llm-deepseek` settings section. The profile carries the
 * endpoint and model catalog; the API key is injected separately through the
 * launching environment and never lands in this file.
 */
export function writeDshProviderSettings(settingsPath: string, profile: ProviderProfile): void {
  writeSection(settingsPath, 'llm-deepseek', toDshSettings(profile))
}

/** Select the agent preset DSH composes new sessions from. */
export function writeDshAgentPresetDefault(settingsPath: string, mode: Mode): void {
  writeSection(settingsPath, 'agent-presets', { default: mode })
}
