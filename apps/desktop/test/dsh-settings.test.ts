import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import yaml from 'js-yaml'
import { writeDshAgentPresetDefault, writeDshProviderSettings } from '../src/main/dsh-settings.js'
import { DEEPSEEK_DEFAULT } from '../src/main/providers.js'

const tempDirs: string[] = []

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('writeDshProviderSettings', () => {
  it('writes the llm-deepseek section and preserves other sections', () => {
    const dir = mkdtempSync(join(tmpdir(), 'closerai-settings-'))
    tempDirs.push(dir)
    const settingsPath = join(dir, 'settings.yaml')

    writeDshProviderSettings(settingsPath, DEEPSEEK_DEFAULT)
    const doc = yaml.load(readFileSync(settingsPath, 'utf8')) as Record<string, unknown>
    expect(doc['llm-deepseek']).toBeTruthy()
    const section = doc['llm-deepseek'] as Record<string, unknown>
    expect(section.baseURL).toBe('https://api.deepseek.com/v1')
    expect(Array.isArray(section.models)).toBe(true)
  })

  it('never contains an API key', () => {
    const dir = mkdtempSync(join(tmpdir(), 'closerai-settings-'))
    tempDirs.push(dir)
    const settingsPath = join(dir, 'settings.yaml')
    writeDshProviderSettings(settingsPath, DEEPSEEK_DEFAULT)
    const text = readFileSync(settingsPath, 'utf8')
    expect(text).not.toContain('apiKey')
    expect(text).not.toContain('sk-')
  })
})

describe('writeDshAgentPresetDefault', () => {
  it('writes the default preset selector and preserves other sections', () => {
    const dir = mkdtempSync(join(tmpdir(), 'closerai-settings-'))
    tempDirs.push(dir)
    const settingsPath = join(dir, 'settings.yaml')

    writeDshAgentPresetDefault(settingsPath, 'code')
    const doc = yaml.load(readFileSync(settingsPath, 'utf8')) as Record<string, unknown>
    expect(doc['agent-presets']).toEqual({ default: 'code' })

    // overwriting a different mode replaces the default without losing
    // unrelated top-level sections (e.g. llm-deepseek written earlier)
    writeDshProviderSettings(settingsPath, DEEPSEEK_DEFAULT)
    writeDshAgentPresetDefault(settingsPath, 'work')
    const again = yaml.load(readFileSync(settingsPath, 'utf8')) as Record<string, unknown>
    expect(again['agent-presets']).toEqual({ default: 'work' })
    expect(again['llm-deepseek']).toBeTruthy()
  })
})
