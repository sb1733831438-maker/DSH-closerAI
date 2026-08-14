import { cp, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Mode } from '../shared/types.js'

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
 * Copy the bundled Chat/Work/Code presets into the DSH home's user-writable
 * agent-presets root, so the DSH roster discovers exactly the three modes.
 */
export async function installPresets(dshHome: string): Promise<void> {
  const root = join(dshHome, '.agent-presets')
  await mkdir(root, { recursive: true })
  for (const mode of MODES) {
    await cp(join(PRESET_SOURCE, mode), join(root, mode), { recursive: true, force: true })
  }
}
