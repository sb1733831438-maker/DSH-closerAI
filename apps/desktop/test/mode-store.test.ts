import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { AppConfigStore } from '../src/main/mode-store.js'

const tempDirs: string[] = []

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function makeStore(): AppConfigStore {
  const dir = mkdtempSync(join(tmpdir(), 'closerai-mode-'))
  tempDirs.push(dir)
  return new AppConfigStore(join(dir, 'app-config.json'))
}

describe('AppConfigStore', () => {
  it('defaults to chat with no workspace', () => {
    const store = makeStore()
    expect(store.read()).toEqual({ mode: 'chat', workspaceDir: null })
  })

  it('persists the code mode with an authorized workspace', () => {
    const store = makeStore()
    store.write({ mode: 'code', workspaceDir: 'C:/projects/app' })
    expect(store.read()).toEqual({ mode: 'code', workspaceDir: 'C:/projects/app' })
  })

  it('ignores an unknown mode value', () => {
    const store = makeStore()
    store.write({ mode: 'hack' as never, workspaceDir: null })
    expect(store.read().mode).toBe('chat')
  })
})
