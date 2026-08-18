import { dialog, ipcMain } from 'electron'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  DEEPSEEK_DEFAULT,
  MOCK_DEFAULT,
  normalizeProviderProfile,
  testConnectivity,
} from './providers.js'
import type { ProviderStoreFile } from './provider-store.js'
import type { SecretStore } from './secrets.js'
import type { AppConfigStore } from './mode-store.js'
import type { CapabilitiesStore } from './capabilities.js'
import { MODE_PERMISSIONS } from './permissions.js'
import { buildDiagnostics, renderDiagnosticsReport } from './diagnostics.js'
import type { ProjectStore } from './project-store.js'
import type { SessionStore } from './session-store.js'
import { workspaceKeyFromPath } from './session-store.js'
import type {
  AppConfig,
  AppState,
  Capabilities,
  CreateProjectInput,
  DiagnosticLogLine,
  Diagnostics,
  OpResult,
  Project,
} from '../shared/types.js'
import { IPC, type SaveProviderInput, type TestProviderInput } from '../shared/ipc.js'

export interface IpcDeps {
  providerStore: ProviderStoreFile
  secretStore: SecretStore
  configStore: AppConfigStore
  projectStore: ProjectStore
  sessionStore: SessionStore
  capabilitiesStore: CapabilitiesStore
  /** The current workspace root for the active mode/project. */
  workspaceDir: () => string
  /** Called when onboarding completes, the mode changes, or a project is
   *  activated; restarts DSH against the new profile/workspace. */
  onComplete: () => void
  /** Current DSH backend URL, or null when no backend is running. */
  backendUrl: () => string | null
  /** Navigate the shell back to the DSH chat UI. */
  showChat: () => void
  /** Navigate the shell to the CloserAI management page. */
  showManage: () => void
  /** Redacted recent child log lines for diagnostics. */
  diagnosticsLogs: () => DiagnosticLogLine[]
  /** Supervisor state for the diagnostics snapshot. */
  supervisorStatus: () => { state: string; pid: number | null }
  /** Read the OS login-item state. */
  getLaunchAtLogin: () => boolean
  /** Apply the login-item state (config + OS), then refresh the tray menu. */
  setLaunchAtLogin: (enabled: boolean) => void
}

function ok(): OpResult {
  return { ok: true }
}

function fail(error: unknown): OpResult {
  return {
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  }
}

/** Materialize an activated project into the existing AppConfig so the DSH
 *  backend (preset + workspace) is driven by the project's mode/directory. */
function applyProjectToConfig(configStore: AppConfigStore, projectStore: ProjectStore): void {
  const active = projectStore.getActive()
  if (active === null) return
  const current = configStore.read()
  const next: AppConfig = {
    mode: active.mode,
    workspaceDir:
      active.mode === 'code' && active.workspaceDir !== null
        ? active.workspaceDir
        : current.workspaceDir,
    launchAtLogin: current.launchAtLogin,
  }
  configStore.write(next)
}

export { applyProjectToConfig }

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

  // --- session history -------------------------------------------------

  ipcMain.handle(IPC.sessionsList, () => deps.sessionStore.list())

  ipcMain.handle(IPC.sessionsDelete, async (_event, id: string): Promise<OpResult> => {
    try {
      await deps.sessionStore.delete(id)
      return ok()
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle(
    IPC.sessionsExport,
    async (_event, id: string, destDir: string): Promise<OpResult> => {
      try {
        const path = await deps.sessionStore.exportTo(id, destDir)
        return { ok: true, path }
      } catch (error) {
        return fail(error)
      }
    },
  )

  ipcMain.handle(IPC.sessionsImport, async (_event, srcDir: string): Promise<OpResult> => {
    try {
      const path = await deps.sessionStore.importFrom(
        srcDir,
        workspaceKeyFromPath(deps.workspaceDir()),
      )
      return { ok: true, path }
    } catch (error) {
      return fail(error)
    }
  })

  // --- projects --------------------------------------------------------

  ipcMain.handle(IPC.projectsList, () => deps.projectStore.read())

  ipcMain.handle(
    IPC.projectsCreate,
    (_event, input: CreateProjectInput): OpResult & { project?: unknown } => {
      try {
        const project = deps.projectStore.create(input)
        applyProjectToConfig(deps.configStore, deps.projectStore)
        deps.onComplete()
        return { ok: true, project }
      } catch (error) {
        return fail(error)
      }
    },
  )

  ipcMain.handle(IPC.projectsUpdate, (_event, project: Project): OpResult => {
    try {
      deps.projectStore.update(project)
      applyProjectToConfig(deps.configStore, deps.projectStore)
      deps.onComplete()
      return ok()
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle(IPC.projectsDelete, (_event, id: string): OpResult => {
    try {
      deps.projectStore.remove(id)
      applyProjectToConfig(deps.configStore, deps.projectStore)
      deps.onComplete()
      return ok()
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle(IPC.projectsActivate, (_event, id: string | null): OpResult => {
    try {
      deps.projectStore.setActive(id)
      applyProjectToConfig(deps.configStore, deps.projectStore)
      deps.onComplete()
      return ok()
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle(IPC.appState, async (): Promise<AppState> => {
    const projects = deps.projectStore.read()
    const sessions = await deps.sessionStore.list()
    return {
      mode: deps.configStore.read().mode,
      activeProjectId: projects.activeProjectId,
      projects: projects.projects,
      sessions,
      capabilities: deps.capabilitiesStore.read(),
      permissions: MODE_PERMISSIONS,
      launchAtLogin: deps.getLaunchAtLogin(),
      backendUrl: deps.backendUrl(),
    }
  })
  ipcMain.handle(IPC.navChat, () => {
    deps.showChat()
    return { ok: true }
  })

  ipcMain.handle(IPC.navManage, () => {
    deps.showManage()
    return { ok: true }
  })

  ipcMain.handle(IPC.capsGet, (): Capabilities => deps.capabilitiesStore.read())

  ipcMain.handle(IPC.capsSet, (_event, caps: Capabilities): OpResult => {
    try {
      deps.capabilitiesStore.write(caps)
      deps.onComplete()
      return ok()
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle(IPC.appDiagnostics, async (): Promise<Diagnostics> => {
    const projects = deps.projectStore.read()
    const active = projects.projects.find((p) => p.id === projects.activeProjectId) ?? null
    const sessions = await deps.sessionStore.list()
    const status = deps.supervisorStatus()
    return buildDiagnostics({
      appVersion: '0.0.7',
      platform: process.platform,
      mode: deps.configStore.read().mode,
      activeProjectName: active?.name ?? null,
      capabilities: deps.capabilitiesStore.read(),
      sessionCount: sessions.length,
      backendUrl: deps.backendUrl(),
      supervisorState: status.state,
      supervisorPid: status.pid,
      logLines: deps.diagnosticsLogs().slice(-500),
      generatedAt: Date.now(),
    })
  })

  ipcMain.handle(IPC.appExportDiagnostics, async (_event, destDir: string): Promise<OpResult> => {
    try {
      const projects = deps.projectStore.read()
      const active = projects.projects.find((p) => p.id === projects.activeProjectId) ?? null
      const sessions = await deps.sessionStore.list()
      const status = deps.supervisorStatus()
      const diag = buildDiagnostics({
        appVersion: '0.0.7',
        platform: process.platform,
        mode: deps.configStore.read().mode,
        activeProjectName: active?.name ?? null,
        capabilities: deps.capabilitiesStore.read(),
        sessionCount: sessions.length,
        backendUrl: deps.backendUrl(),
        supervisorState: status.state,
        supervisorPid: status.pid,
        logLines: deps.diagnosticsLogs().slice(-500),
        generatedAt: Date.now(),
      })
      const file = join(destDir, 'closerai-diagnostics-' + Date.now() + '.txt')
      await writeFile(file, renderDiagnosticsReport(diag), 'utf8')
      return { ok: true, path: file }
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle(IPC.launchAtLoginGet, (): boolean => deps.getLaunchAtLogin())

  ipcMain.handle(IPC.launchAtLoginSet, (_event, enabled: boolean): OpResult => {
    try {
      deps.setLaunchAtLogin(enabled)
      return ok()
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle(IPC.dialogPickDirectory, async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0] ?? null
  })
}
