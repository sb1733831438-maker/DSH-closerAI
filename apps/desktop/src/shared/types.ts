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
  /** Whether the app should start at login (tray toggle). */
  launchAtLogin: boolean
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
  capabilities: Capabilities
  permissions: ModePermissions[]
  launchAtLogin: boolean
  backendUrl: string | null
  /** DSH home mode: system-sync (shared ~/.dsh) or managed (isolated). */
  dshMode: 'system-sync' | 'managed'
  /**
   * Non-null when the last system-sync boot failed (e.g. the ~/.dsh home is
   * owned by another running DSH like the web DSH). Shown as a prominent
   * recovery card so the user knows why DSH did not start and what to do.
   */
  systemSyncError: string | null
}

/** Per-mode capability toggles applied when installing the agent presets. */
export interface Capabilities {
  /** Whether the web search tool is mounted in Chat/Work/Code presets. */
  webSearch: boolean
  /** Whether the web tool may fetch page contents (fetch) in addition to search. */
  webFetch: boolean
  /** Whether the skills tool is mounted (Code preset). */
  skills: boolean
}

/** One captured child log line, redacted before it leaves the main process. */
export interface DiagnosticLogLine {
  stream: 'stdout' | 'stderr'
  text: string
  at: number
}

/** Diagnostics snapshot shown in the management page / export bundle. */
export interface Diagnostics {
  appVersion: string
  platform: string
  mode: Mode
  activeProjectName: string | null
  capabilities: Capabilities
  sessionCount: number
  backendUrl: string | null
  supervisorState: string
  supervisorPid: number | null
  logLines: DiagnosticLogLine[]
  generatedAt: number
}

/** One granted capability inside a mode's permission manifest. */
export interface PermissionEntry {
  /** Display name of the tool / capability. */
  tool: string
  /** What the tool may do. */
  permission: string
}

/** The designed permission surface for one mode (drives the manifest UI). */
export interface ModePermissions {
  mode: Mode
  entries: PermissionEntry[]
}

/** Auto-update status surfaced to the shell UI. */
export type UpdateStatus =
  | { state: 'disabled' }
  | { state: 'checking' }
  | { state: 'up-to-date' }
  | { state: 'available'; version: string }
  | { state: 'downloading'; percent: number }
  | { state: 'downloaded'; version: string }
  | { state: 'error'; message: string }

export type McpTransport = 'stdio' | 'http'

/** A user-managed MCP server definition (CloserAI-side registry). */
export interface McpServer {
  /** Stable local id. */
  id: string
  /** Display name (also the key in the exported mcpServers map). */
  name: string
  enabled: boolean
  transport: McpTransport
  description?: string
  /** stdio transport: command + optional args + env. */
  command?: string
  args?: string[]
  env?: Record<string, string>
  /** http transport: URL + optional headers. */
  url?: string
  headers?: Record<string, string>
  createdAt: number
  updatedAt: number
}

export interface McpStoreData {
  servers: McpServer[]
}
