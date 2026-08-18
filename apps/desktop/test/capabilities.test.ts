import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  CapabilitiesStore,
  DEFAULT_CAPABILITIES,
  renderPresetYaml,
} from '../src/main/capabilities.js'
import { installPresets, MODES } from '../src/main/presets.js'

const tempDirs: string[] = []

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

// A representative slice of a preset composition (matches the checked-in
// shapes: tool-web with config, tool-skill bare, plus unrelated blocks).
const SAMPLE = [
  '- id: persona',
  "  name: '@deepseek-ai/dsh-persona'",
  '  config:',
  '    text: hello',
  '- id: tool-web',
  "  name: '@deepseek-ai/dsh-tool-web'",
  '  config:',
  '    fetch: false',
  '    searchTimeoutMs: 60000',
  '- id: tool-ask-user',
  "  name: '@deepseek-ai/dsh-tool-ask-user'",
  '- id: tool-skill',
  "  name: '@deepseek-ai/dsh-tool-skill'",
  '- id: tool-todo',
  "  name: '@deepseek-ai/dsh-tool-todo'",
  '  config:',
  '    allowParallelInProgress: true',
].join('\n')

describe('renderPresetYaml', () => {
  it('keeps web + skills enabled by default', () => {
    const out = renderPresetYaml(SAMPLE, DEFAULT_CAPABILITIES)
    expect(out).toContain("name: '@deepseek-ai/dsh-tool-web'")
    expect(out).toContain('fetch: false')
    expect(out).not.toMatch(/tool-web[\s\S]*disabled: true/)
    expect(out).not.toContain('tool-skill\n  disabled: true')
  })

  it('disables the web tool when webSearch is off', () => {
    const out = renderPresetYaml(SAMPLE, { ...DEFAULT_CAPABILITIES, webSearch: false })
    const webBlock = out.split('- id: tool-web')[1]!.split('- id: tool-ask-user')[0]!
    expect(webBlock).toContain('disabled: true')
  })

  it('enables fetch when webFetch is on', () => {
    const out = renderPresetYaml(SAMPLE, { ...DEFAULT_CAPABILITIES, webFetch: true })
    expect(out).toContain('fetch: true')
  })

  it('disables the skill tool when skills is off', () => {
    const out = renderPresetYaml(SAMPLE, { ...DEFAULT_CAPABILITIES, skills: false })
    const skillBlock = out.split('- id: tool-skill')[1]!.split('- id: tool-todo')[0]!
    expect(skillBlock).toContain('disabled: true')
  })

  it('leaves unrelated blocks untouched', () => {
    const out = renderPresetYaml(SAMPLE, { webSearch: false, webFetch: true, skills: false })
    expect(out).toContain('    text: hello')
    expect(out).toContain('    allowParallelInProgress: true')
  })
})

describe('CapabilitiesStore', () => {
  it('returns defaults on missing file', () => {
    const store = new CapabilitiesStore(join(mkdtempSync(join(tmpdir(), 'caps-')), 'caps.json'))
    expect(store.read()).toEqual(DEFAULT_CAPABILITIES)
  })

  it('round-trips writes', () => {
    const dir = mkdtempSync(join(tmpdir(), 'caps-'))
    tempDirs.push(dir)
    const store = new CapabilitiesStore(join(dir, 'caps.json'))
    store.write({ webSearch: false, webFetch: true, skills: false })
    const reloaded = new CapabilitiesStore(join(dir, 'caps.json'))
    expect(reloaded.read()).toEqual({ webSearch: false, webFetch: true, skills: false })
  })
})

describe('installPresets with capabilities', () => {
  it('renders toggles into the installed chat composition', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'closerai-caps-presets-'))
    tempDirs.push(dir)
    await installPresets(dir, { webSearch: false, webFetch: true, skills: false })
    for (const mode of MODES) {
      const text = readFileSync(join(dir, '.agent-presets', mode, 'agent.cordis.yml'), 'utf8')
      // capabilities apply to all three modes
      const webBlock = text.split('- id: tool-web')[1] ?? ''
      expect(webBlock).toContain('disabled: true')
      // preset.yml still copied verbatim
      const meta = readFileSync(join(dir, '.agent-presets', mode, 'preset.yml'), 'utf8')
      expect(meta).toContain('name:')
    }
  })

  it('defaults preserve current behavior (web+skills enabled, fetch off)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'closerai-caps-presets-'))
    tempDirs.push(dir)
    await installPresets(dir)
    const chat = readFileSync(join(dir, '.agent-presets', 'chat', 'agent.cordis.yml'), 'utf8')
    expect(chat).toContain("name: '@deepseek-ai/dsh-tool-web'")
    expect(chat).toContain('fetch: false')
    const code = readFileSync(join(dir, '.agent-presets', 'code', 'agent.cordis.yml'), 'utf8')
    expect(code).toContain("name: '@deepseek-ai/dsh-tool-skill'")
  })
})
