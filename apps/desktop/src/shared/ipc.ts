import type {
  AppConfig,
  AppState,
  Capabilities,
  ConnectivityResult,
  Diagnostics,
  CreateProjectInput,
  OpResult,
  Project,
  ProjectStoreData,
  ProviderProfile,
  SessionEntry,
} from './types.js'

/** IPC channel names shared by the main process and the preload bridge. */
export const IPC = {
  providersList: 'providers:list',
  providersActive: 'providers:active',
  providersDefaults: 'providers:defaults',
  providersSave: 'providers:save',
  providersTest: 'providers:test',
  onboardingComplete: 'onboarding:complete',
  modeGet: 'mode:get',
  modeSet: 'mode:set',
  sessionsList: 'sessions:list',
  sessionsDelete: 'sessions:delete',
  sessionsExport: 'sessions:export',
  sessionsImport: 'sessions:import',
  projectsList: 'projects:list',
  projectsCreate: 'projects:create',
  projectsUpdate: 'projects:update',
  projectsDelete: 'projects:delete',
  projectsActivate: 'projects:activate',
  appState: 'app:state',
  navChat: 'nav:chat',
  navManage: 'nav:manage',
  dialogPickDirectory: 'dialog:pick-directory',
  capsGet: 'caps:get',
  capsSet: 'caps:set',
  appDiagnostics: 'app:diagnostics',
  appExportDiagnostics: 'app:export-diagnostics',
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
  getMode(): Promise<AppConfig>
  setMode(config: AppConfig): Promise<{ ok: boolean }>
  getAppState(): Promise<AppState>
  listSessions(): Promise<SessionEntry[]>
  deleteSession(id: string): Promise<OpResult>
  exportSession(id: string, destDir: string): Promise<OpResult>
  importSession(srcDir: string): Promise<OpResult>
  listProjects(): Promise<ProjectStoreData>
  createProject(input: CreateProjectInput): Promise<OpResult & { project?: Project }>
  updateProject(project: Project): Promise<OpResult>
  deleteProject(id: string): Promise<OpResult>
  activateProject(id: string | null): Promise<OpResult>
  openChat(): Promise<{ ok: boolean }>
  openManage(): Promise<{ ok: boolean }>
  pickDirectory(): Promise<string | null>
  getCapabilities(): Promise<Capabilities>
  setCapabilities(caps: Capabilities): Promise<OpResult>
  getDiagnostics(): Promise<Diagnostics>
  exportDiagnostics(destDir: string): Promise<OpResult>
}
