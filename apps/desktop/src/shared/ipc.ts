import type { ConnectivityResult, ProviderProfile } from './types.js'

/** IPC channel names shared by the main process and the preload bridge. */
export const IPC = {
  providersList: 'providers:list',
  providersActive: 'providers:active',
  providersDefaults: 'providers:defaults',
  providersSave: 'providers:save',
  providersTest: 'providers:test',
  onboardingComplete: 'onboarding:complete',
} as const

export interface SaveProviderInput {
  profile: ProviderProfile
  apiKey?: string
}

export interface TestProviderInput {
  profile: ProviderProfile
  apiKey?: string
}

/** The allow-listed API the preload exposes to the renderer. */
export interface CloserAiBridge {
  platform: string
  appVersion: string
  listProviders(): Promise<ProviderProfile[]>
  getActiveProvider(): Promise<ProviderProfile | null>
  getDefaults(): Promise<{ deepseek: ProviderProfile; mock: ProviderProfile }>
  saveProvider(input: SaveProviderInput): Promise<{ ok: boolean }>
  testProvider(input: TestProviderInput): Promise<ConnectivityResult>
  completeOnboarding(): Promise<{ ok: boolean }>
}
