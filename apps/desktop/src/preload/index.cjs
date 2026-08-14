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
}

/** @type {import('../shared/ipc').CloserAiBridge} */
const api = Object.freeze({
  platform: process.platform,
  appVersion: '0.0.4',
  listProviders: () => ipcRenderer.invoke(IPC.providersList),
  getActiveProvider: () => ipcRenderer.invoke(IPC.providersActive),
  getDefaults: () => ipcRenderer.invoke(IPC.providersDefaults),
  saveProvider: (input) => ipcRenderer.invoke(IPC.providersSave, input),
  testProvider: (input) => ipcRenderer.invoke(IPC.providersTest, input),
  completeOnboarding: () => ipcRenderer.invoke(IPC.onboardingComplete),
  getMode: () => ipcRenderer.invoke(IPC.modeGet),
  setMode: (config) => ipcRenderer.invoke(IPC.modeSet, config),
})

contextBridge.exposeInMainWorld('closerai', api)
