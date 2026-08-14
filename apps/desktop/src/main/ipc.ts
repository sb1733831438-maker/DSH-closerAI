import { ipcMain } from 'electron'
import {
  DEEPSEEK_DEFAULT,
  MOCK_DEFAULT,
  normalizeProviderProfile,
  testConnectivity,
} from './providers.js'
import type { ProviderStoreFile } from './provider-store.js'
import type { SecretStore } from './secrets.js'
import type { AppConfigStore } from './mode-store.js'
import type { AppConfig } from '../shared/types.js'
import { IPC, type SaveProviderInput, type TestProviderInput } from '../shared/ipc.js'

export interface IpcDeps {
  providerStore: ProviderStoreFile
  secretStore: SecretStore
  configStore: AppConfigStore
  /** Called when onboarding completes or the mode changes; restarts DSH. */
  onComplete: () => void
}

export function registerIpcHandlers(deps: IpcDeps): void {
  ipcMain.handle(IPC.providersList, () => deps.providerStore.read().providers)
  ipcMain.handle(IPC.providersActive, () => deps.providerStore.getActive())
  ipcMain.handle(IPC.providersDefaults, () => ({
    deepseek: DEEPSEEK_DEFAULT,
    mock: MOCK_DEFAULT,
  }))

  ipcMain.handle(IPC.providersSave, (_event, input: SaveProviderInput) => {
    const profile = normalizeProviderProfile(input.profile)
    deps.providerStore.saveProfile(profile)
    if (input.apiKey !== undefined && input.apiKey.length > 0) {
      deps.secretStore.set(profile.id, input.apiKey)
    } else {
      deps.secretStore.delete(profile.id)
    }
    return { ok: true }
  })

  ipcMain.handle(IPC.providersTest, async (_event, input: TestProviderInput) => {
    const profile = normalizeProviderProfile(input.profile)
    return testConnectivity({
      baseUrl: profile.baseUrl,
      apiKey: input.apiKey ?? '',
      model: profile.defaultModel,
    })
  })

  ipcMain.handle(IPC.onboardingComplete, () => {
    deps.onComplete()
    return { ok: true }
  })

  ipcMain.handle(IPC.modeGet, () => deps.configStore.read())

  ipcMain.handle(IPC.modeSet, (_event, config: AppConfig) => {
    deps.configStore.write(config)
    deps.onComplete()
    return { ok: true }
  })
}
