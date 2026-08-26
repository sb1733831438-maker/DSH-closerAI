import { readFileSync } from 'node:fs'
import { atomicWriteFileSync } from './fs-atomic.js'
import type { Capabilities } from '../shared/types.js'

export const DEFAULT_CAPABILITIES: Capabilities = {
  webSearch: true,
  webFetch: false,
  skills: true,
}

function isCapabilities(value: unknown): value is Capabilities {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.webSearch === 'boolean' &&
    typeof record.webFetch === 'boolean' &&
    typeof record.skills === 'boolean'
  )
}

export class CapabilitiesStore {
  private readonly filePath: string

  constructor(filePath: string) {
    this.filePath = filePath
  }

  read(): Capabilities {
    try {
      const parsed: unknown = JSON.parse(readFileSync(this.filePath, 'utf8'))
      if (isCapabilities(parsed)) return { ...parsed }
      return { ...DEFAULT_CAPABILITIES }
    } catch {
      // Missing file, unreadable, or corrupt content all self-heal to the
      // defaults instead of crashing the app (REVIEW R-03).
      return { ...DEFAULT_CAPABILITIES }
    }
  }

  write(caps: Capabilities): void {
    const safe: Capabilities = {
      webSearch: caps.webSearch,
      webFetch: caps.webFetch,
      skills: caps.skills,
    }
    atomicWriteFileSync(this.filePath, JSON.stringify(safe, null, 2) + '\n')
  }
}

/**
 * Apply capability toggles to a preset composition (line-based, block-aware).
 *
 * The checked-in presets are DSH plugin-row lists that use YAML tags such as
 * `!!js` which plain js-yaml cannot parse, so instead of a full YAML AST we do
 * a precise, block-scoped text transform keyed on top-level `- id:` entries.
 * Only `tool-web` and `tool-skill` blocks are touched; everything else is
 * passed through byte-for-byte.
 */
const BLOCK_START = /^- id: (\S+)/
const NAME_LINE = /^ {2}name: /
const DISABLED_LINE = /^ {2}disabled: /
const FETCH_LINE = /^( {4}fetch: )(true|false)/

function insertDisabled(block: string[]): string[] {
  if (block.some((line) => DISABLED_LINE.test(line))) return block
  const nameIndex = block.findIndex((line) => NAME_LINE.test(line))
  if (nameIndex === -1) return block
  const out = [...block]
  out.splice(nameIndex + 1, 0, '  disabled: true')
  return out
}

function removeDisabled(block: string[]): string[] {
  return block.filter((line) => !DISABLED_LINE.test(line))
}

function setFetch(block: string[], value: boolean): string[] {
  return block.map((line) =>
    line.replace(FETCH_LINE, (_, prefix: string) => prefix + String(value)),
  )
}

function transformBlock(id: string, block: string[], caps: Capabilities): string[] {
  if (id === 'tool-web') {
    if (!caps.webSearch) return insertDisabled(block)
    return setFetch(removeDisabled(block), caps.webFetch)
  }
  if (id === 'tool-skill') {
    return caps.skills ? removeDisabled(block) : insertDisabled(block)
  }
  return block
}

export function renderPresetYaml(source: string, caps: Capabilities): string {
  const lines = source.split('\n')
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i] ?? ''
    const match = BLOCK_START.exec(line)
    if (match === null) {
      out.push(line)
      i += 1
      continue
    }
    const id = match[1] ?? ''
    const block: string[] = [line]
    let j = i + 1
    while (j < lines.length) {
      const next = lines[j] ?? ''
      if (BLOCK_START.test(next)) break
      block.push(next)
      j += 1
    }
    out.push(...transformBlock(id, block, caps))
    i = j
  }
  return out.join('\n')
}
