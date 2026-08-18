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

/** A user-defined project: a named workspace + mode combination. */
export interface Project {
  /** Stable local id. */
  id: string
  name: string
  mode: Mode
  /** Authorized workspace for Code mode; null until the user picks one. */
  workspaceDir: string | null
  createdAt: number
  updatedAt: number
}

export interface ProjectStoreData {
  activeProjectId: string | null
  projects: Project[]
}

export interface CreateProjectInput {
  name: string
  mode: Mode
  workspaceDir?: string | null
}

/** A session record discovered under DSH_HOME/sessions. */
export interface SessionEntry {
  /** Directory name, e.g. session-<uuid>. */
  id: string
  /** DSH's cwd-encoded workspace key (parent dir name). */
  workspaceKey: string
  /** Absolute path to the session directory. */
  dir: string
  sizeBytes: number
  mtimeMs: number
  fileCount: number
}

/** Result payload for file-backed operations. */
export interface OpResult {
  ok: boolean
  error?: string
  path?: string
}

/** Snapshot the shell UI needs in one call. */
export interface AppState {
  mode: Mode
  activeProjectId: string | null
  projects: Project[]
  sessions: SessionEntry[]
  backendUrl: string | null
}
