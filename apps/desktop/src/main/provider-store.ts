import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { ProviderProfile, ProviderStore } from './providers.js'

const EMPTY_STORE: ProviderStore = { activeProviderId: null, providers: [] }

/** JSON persistence for provider profiles (never holds API keys). */
export class ProviderStoreFile {
  private readonly filePath: string

  constructor(filePath: string) {
    this.filePath = filePath
  }

  read(): ProviderStore {
    try {
      const parsed: unknown = JSON.parse(readFileSync(this.filePath, 'utf8'))
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
        return { ...EMPTY_STORE }
      const store = parsed as Partial<ProviderStore>
      const providers = Array.isArray(store.providers) ? store.providers : []
      const activeProviderId =
        typeof store.activeProviderId === 'string' ? store.activeProviderId : null
      return { activeProviderId, providers: [...providers] }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { ...EMPTY_STORE }
      throw error
    }
  }

  write(store: ProviderStore): void {
    mkdirSync(dirname(this.filePath), { recursive: true })
    writeFileSync(this.filePath, `${JSON.stringify(store, null, 2)}\n`, 'utf8')
  }

  getActive(): ProviderProfile | null {
    const store = this.read()
    if (store.activeProviderId === null) return null
    return store.providers.find((provider) => provider.id === store.activeProviderId) ?? null
  }

  saveProfile(profile: ProviderProfile): void {
    const store = this.read()
    const index = store.providers.findIndex((existing) => existing.id === profile.id)
    if (index >= 0) store.providers[index] = profile
    else store.providers.push(profile)
    store.activeProviderId = profile.id
    this.write(store)
  }
}
