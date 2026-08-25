// @ts-check
// Sandboxed preload: minimal, frozen, allow-listed API exposed to the renderer.
// Kept as plain CommonJS because sandboxed preload scripts cannot use ESM.
const { contextBridge, ipcRenderer } = require('electron')

const IPC = {
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
  launchAtLoginGet: 'app:launch-at-login:get',
  launchAtLoginSet: 'app:launch-at-login:set',
}

/** @type {import('../shared/ipc').CloserAiBridge} */
const api = Object.freeze({
  platform: process.platform,
  appVersion: '0.3.0',
  listProviders: () => ipcRenderer.invoke(IPC.providersList),
  getActiveProvider: () => ipcRenderer.invoke(IPC.providersActive),
  getDefaults: () => ipcRenderer.invoke(IPC.providersDefaults),
  saveProvider: (input) => ipcRenderer.invoke(IPC.providersSave, input),
  testProvider: (input) => ipcRenderer.invoke(IPC.providersTest, input),
  completeOnboarding: () => ipcRenderer.invoke(IPC.onboardingComplete),
  getMode: () => ipcRenderer.invoke(IPC.modeGet),
  setMode: (config) => ipcRenderer.invoke(IPC.modeSet, config),
  getAppState: () => ipcRenderer.invoke(IPC.appState),
  listSessions: () => ipcRenderer.invoke(IPC.sessionsList),
  deleteSession: (id) => ipcRenderer.invoke(IPC.sessionsDelete, id),
  exportSession: (id, destDir) => ipcRenderer.invoke(IPC.sessionsExport, id, destDir),
  importSession: (srcDir) => ipcRenderer.invoke(IPC.sessionsImport, srcDir),
  listProjects: () => ipcRenderer.invoke(IPC.projectsList),
  createProject: (input) => ipcRenderer.invoke(IPC.projectsCreate, input),
  updateProject: (project) => ipcRenderer.invoke(IPC.projectsUpdate, project),
  deleteProject: (id) => ipcRenderer.invoke(IPC.projectsDelete, id),
  activateProject: (id) => ipcRenderer.invoke(IPC.projectsActivate, id),
  openChat: () => ipcRenderer.invoke(IPC.navChat),
  openManage: () => ipcRenderer.invoke(IPC.navManage),
  pickDirectory: () => ipcRenderer.invoke(IPC.dialogPickDirectory),
})

contextBridge.exposeInMainWorld('closerai', api)
