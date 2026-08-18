import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Capabilities, Mode } from '../shared/types.js'
import { DEFAULT_CAPABILITIES, renderPresetYaml } from './capabilities.js'

const here = dirname(fileURLToPath(import.meta.url))
// Two levels up from src/main (or dist/main) is the package root, which holds
// the checked-in presets directory — so tests and the built app read the same
// files.
const PRESET_SOURCE = join(here, '..', '..', 'presets')

export const MODES: readonly Mode[] = ['chat', 'work', 'code'] as const

export const MODE_DISPLAY: Record<Mode, string> = {
  chat: 'Chat',
  work: 'Work',
  code: 'Code',
}

export function isMode(value: string): value is Mode {
  return value === 'chat' || value === 'work' || value === 'code'
}

/**
 * Install the bundled Chat/Work/Code presets into the DSH home's user-writable
 * agent-presets root, so the DSH roster discovers exactly the three modes.
 * Capability toggles are rendered into each composition at install time.
 */
export async function installPresets(
  dshHome: string,
  capabilities: Capabilities = DEFAULT_CAPABILITIES,
): Promise<void> {
  const root = join(dshHome, '.agent-presets')
  await mkdir(root, { recursive: true })
  for (const mode of MODES) {
    const target = join(root, mode)
    await mkdir(target, { recursive: true })
    // preset.yml metadata is copied verbatim...
    await cp(join(PRESET_SOURCE, mode, 'preset.yml'), join(target, 'preset.yml'), {
      force: true,
    })
    // ...while the tool composition is rendered against the capability set.
    const composition = await readFile(join(PRESET_SOURCE, mode, 'agent.cordis.yml'), 'utf8')
    await writeFile(
      join(target, 'agent.cordis.yml'),
      renderPresetYaml(composition, capabilities),
      'utf8',
    )
  }
}
