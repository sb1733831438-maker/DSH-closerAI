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
// The app's own renderer entry (onboarding + manage views). Navigation to this
// file (with any query) is trusted; everything else stays locked to the target
// origin or is denied.
const appIndexHtml = join(here, '..', 'renderer', 'index.html')

export type WindowTarget = { kind: 'url'; url: string } | { kind: 'file'; path: string }

/** Whether a URL is the app's own renderer entry page (file://, any query). */
function isAppIndexNavigation(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'file:') return false
    const expected = appIndexHtml.replace(/\\/g, '/').toLowerCase()
    return parsed.pathname.toLowerCase() === expected
  } catch {
    return false
  }
}

function targetOrigin(target: WindowTarget): string | null {
  if (target.kind === 'url') {
    try {
      return new URL(target.url).origin
    } catch {
      return null
    }
  }
  return null
}

/**
 * Create the single hardened BrowserWindow. Security posture: strict CSP on
 * every HTTP response, navigation locked to the target origin (file targets
 * allow no navigation at all), new windows denied with external http/https
 * links opened in the system browser, and every permission request denied.
 */
export function createWindow(target: WindowTarget): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    title: 'CloserAI',
    icon: join(here, '..', '..', 'resources', 'icon.png'),
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

  const origin = targetOrigin(target)
  window.webContents.on('will-navigate', (event, url) => {
    if (isAppIndexNavigation(url)) return
    const allowed = origin !== null && isAllowedInternalNavigation(url, origin)
    if (!allowed) {
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
  if (target.kind === 'url') void window.loadURL(target.url)
  else void window.loadFile(target.path)
  return window
}
