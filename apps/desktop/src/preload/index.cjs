// @ts-check
// Sandboxed preload: minimal, frozen, allow-listed API exposed to the renderer.
// Kept as plain CommonJS because sandboxed preload scripts cannot use ESM.
const { contextBridge } = require('electron')

/** @type {Readonly<{ platform: string, appVersion: string }>} */
const api = Object.freeze({
  platform: process.platform,
  appVersion: '0.0.2',
})

contextBridge.exposeInMainWorld('closerai', api)
