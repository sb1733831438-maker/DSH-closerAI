import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { app, Menu, Notification, Tray, nativeImage } from 'electron'

const here = dirname(fileURLToPath(import.meta.url))
// dist/main -> package root resources/tray.png
const TRAY_ICON = join(here, '..', '..', 'resources', 'tray.png')

export interface TrayDeps {
  onOpenChat: () => void
  onOpenManage: () => void
  onQuit: () => void
  getLaunchAtLogin: () => boolean
  setLaunchAtLogin: (enabled: boolean) => void
}

let tray: Tray | null = null

function buildMenu(deps: TrayDeps): Menu {
  return Menu.buildFromTemplate([
    { label: '返回对话', click: deps.onOpenChat },
    { label: '工作区与历史', click: deps.onOpenManage },
    { type: 'separator' },
    {
      label: '开机启动',
      type: 'checkbox',
      checked: deps.getLaunchAtLogin(),
      click: (item) => deps.setLaunchAtLogin(item.checked),
    },
    { type: 'separator' },
    { label: '退出', click: deps.onQuit },
  ])
}

/**
 * Create the system tray icon with quick actions. Returns null when the icon
 * cannot be loaded (e.g. an environment without a tray).
 */
export function createTray(deps: TrayDeps): Tray | null {
  if (tray !== null) return tray
  const image = nativeImage.createFromPath(TRAY_ICON)
  if (image.isEmpty()) return null
  tray = new Tray(image)
  tray.setToolTip('CloserAI')
  tray.setContextMenu(buildMenu(deps))
  tray.on('click', deps.onOpenChat)
  return tray
}

export function updateTrayMenu(deps: TrayDeps): void {
  if (tray === null) return
  tray.setContextMenu(buildMenu(deps))
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}

/** Best-effort login-item toggle for the current platform. */
export function applyLaunchAtLogin(enabled: boolean): void {
  if (process.platform === 'linux') return // unsupported
  app.setLoginItemSettings({
    openAtLogin: enabled,
    // keep the process name stable so updates do not break the toggle
    path: process.execPath,
  })
}

export function getLaunchAtLogin(): boolean {
  if (process.platform === 'linux') return false
  return app.getLoginItemSettings().openAtLogin
}

export function notify(title: string, body: string): void {
  // Notifications are best-effort; never crash the app over them.
  try {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show()
    }
  } catch {
    // ignore
  }
}
