import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BrowserWindow, session, shell } from 'electron'
import {
  buildContentSecurityPolicy,
  externalNavigationAction,
  hardenedWebPreferences,
  isAllowedInternalNavigation,
} from './security.js'

const here = dirname(fileURLToPath(import.meta.url))
const preloadPath = join(here, '..', 'preload', 'index.cjs')

/**
 * Create the single hardened BrowserWindow and load the DSH web UI.
 *
 * Security posture: strict CSP on every response, navigation locked to the DSH
 * origin, new windows denied (external https/http links open in the system
 * browser), and every permission request (mic/camera/etc.) denied.
 */
export function createMainWindow(dshUrl: string): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    title: 'CloserAI',
    webPreferences: hardenedWebPreferences(preloadPath),
  })

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [buildContentSecurityPolicy()],
      },
    })
  })

  window.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedInternalNavigation(url, dshUrl)) {
      event.preventDefault()
      if (externalNavigationAction(url) === 'open') void shell.openExternal(url)
    }
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (externalNavigationAction(url) === 'open') void shell.openExternal(url)
    return { action: 'deny' }
  })

  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false)
  })

  window.once('ready-to-show', () => window.show())
  void window.loadURL(dshUrl)
  return window
}
