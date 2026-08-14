import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { installPresets, isMode, MODES } from '../src/main/presets.js'

const tempDirs: string[] = []

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('installPresets', () => {
  it('copies all three modes with well-formed compositions', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'closerai-presets-'))
    tempDirs.push(dir)

    await installPresets(dir)

    for (const mode of MODES) {
      const composition = readFileSync(
        join(dir, '.agent-presets', mode, 'agent.cordis.yml'),
        'utf8',
      )
      // The composition is a plugin-row list: every row names a plugin or the
      // cordis:group builtin. We assert shape without parsing `!!js` tags,
      // which need DSH's own YAML schema.
      expect(composition).toContain('name:')
      expect(composition).toContain('- id:')

      const meta = readFileSync(join(dir, '.agent-presets', mode, 'preset.yml'), 'utf8')
      expect(meta).toContain('name:')
    }
  })

  it('gives chat no shell and code a shell', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'closerai-presets-'))
    tempDirs.push(dir)

    await installPresets(dir)
    const chat = readFileSync(join(dir, '.agent-presets', 'chat', 'agent.cordis.yml'), 'utf8')
    const code = readFileSync(join(dir, '.agent-presets', 'code', 'agent.cordis.yml'), 'utf8')

    expect(chat).not.toContain('dsh-tool-bash')
    expect(chat).not.toContain('dsh-fs-local')
    expect(code).toContain('dsh-tool-bash')
    expect(code).toContain('dsh-fs-local')
  })

  it('declares exactly chat, work, code', () => {
    expect(MODES).toEqual(['chat', 'work', 'code'])
    expect(isMode('chat')).toBe(true)
    expect(isMode('code')).toBe(true)
    expect(isMode('nope')).toBe(false)
  })
})
