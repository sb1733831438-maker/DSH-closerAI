export type ProviderKind = 'deepseek' | 'openai-compatible' | 'mock'

/** The three permission-isolated working modes. */
export type Mode = 'chat' | 'work' | 'code'

export interface ModelEntry {
  id: string
  name?: string
  contextWindow?: number
}

export interface ProviderProfile {
  /** Stable local id; the API key is stored separately in the OS keychain. */
  id: string
  kind: ProviderKind
  /** Display name, e.g. "DeepSeek" or "My local gateway". */
  name: string
  /** Full endpoint prefix including /v1, e.g. https://api.deepseek.com/v1. */
  baseUrl: string
  defaultModel: string
  models: ModelEntry[]
}

export interface ProviderStore {
  activeProviderId: string | null
  providers: ProviderProfile[]
}

export interface ConnectivityResult {
  ok: boolean
  status?: number
  error?: string
}

export interface AppConfig {
  mode: Mode
  /** The authorized directory for Code mode; null until the user picks one. */
  workspaceDir: string | null
}
