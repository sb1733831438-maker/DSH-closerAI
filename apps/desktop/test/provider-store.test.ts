import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { ProviderStoreFile } from '../src/main/provider-store.js'
import type { ProviderProfile } from '../src/main/providers.js'

const tempDirs: string[] = []

function makeStore(): ProviderStoreFile {
  const dir = mkdtempSync(join(tmpdir(), 'closerai-providers-'))
  tempDirs.push(dir)
  return new ProviderStoreFile(join(dir, 'providers.json'))
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

const profile: ProviderProfile = {
  id: 'deepseek-official',
  kind: 'deepseek',
  name: 'DeepSeek',
  baseUrl: 'https://api.deepseek.com/v1',
  defaultModel: 'deepseek-v4-pro',
  models: [{ id: 'deepseek-v4-pro' }],
}

describe('ProviderStoreFile', () => {
  it('starts empty', () => {
    const store = makeStore()
    expect(store.read().providers).toEqual([])
    expect(store.getActive()).toBeNull()
  })

  it('saves a profile and makes it active', () => {
    const store = makeStore()
    store.saveProfile(profile)
    expect(store.getActive()?.id).toBe('deepseek-official')
    expect(store.read().activeProviderId).toBe('deepseek-official')
  })

  it('updates an existing profile by id', () => {
    const store = makeStore()
    store.saveProfile(profile)
    store.saveProfile({ ...profile, name: 'Renamed' })
    const providers = store.read().providers
    expect(providers).toHaveLength(1)
    expect(providers[0]!.name).toBe('Renamed')
  })
})
