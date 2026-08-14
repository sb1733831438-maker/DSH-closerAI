import { app, type BrowserWindow } from 'electron'
import { DEEP_LINK_SCHEME, parseDeepLink } from './deep-link.js'
import { startDsh } from './dsh.js'
import { createMainWindow } from './window.js'

const isSmokeTest = process.argv.includes('--smoke-test')

function main(): void {
  let window: BrowserWindow | null = null
  let dsh: Awaited<ReturnType<typeof startDsh>> | null = null
  let quitting = false

  const focusWindow = (): void => {
    if (window === null || window.isDestroyed()) return
    if (window.isMinimized()) window.restore()
    window.focus()
  }

  const handleDeepLink = (link: string): void => {
    if (parseDeepLink(link) !== null) focusWindow()
  }

  const boot = async (): Promise<void> => {
    try {
      dsh = await startDsh(app.getPath('userData'))
      window = createMainWindow(dsh.url)

      dsh.supervisor.on('ready', (status) => {
        if (status.url !== null && window !== null && !window.isDestroyed()) {
          void window.loadURL(status.url)
        }
      })
      dsh.supervisor.on('failed', (error) => {
        console.error('[closerai] DSH failed:', error.message)
      })

      if (isSmokeTest) {
        window.webContents.once('did-finish-load', async () => {
          // Prove the SPA actually mounted, not just that HTML was served.
          const rootChildren = await window!.webContents.executeJavaScript(
            "document.getElementById('root')?.childElementCount ?? 0",
          )
          const title = await window!.webContents.executeJavaScript('document.title')
          console.log(
            `[closerai] smoke: loaded ${dsh!.url} title="${title}" rootChildren=${rootChildren}`,
          )
          const ok = typeof rootChildren === 'number' && rootChildren > 0
          await dsh!.supervisor.stop()
          app.exit(ok ? 0 : 1)
        })
        window.webContents.once('did-fail-load', async (_event, code, description) => {
          console.error(`[closerai] smoke: failed to load (${code}) ${description}`)
          await dsh!.supervisor.stop()
          app.exit(1)
        })
      }
    } catch (error) {
      console.error('[closerai] boot failed:', error instanceof Error ? error.message : error)
      app.exit(1)
    }
  }

  app.on('second-instance', (_event, argv) => {
    focusWindow()
    const link = argv.find((arg) => arg.startsWith(`${DEEP_LINK_SCHEME}://`))
    if (link !== undefined) handleDeepLink(link)
  })

  app.on('render-process-gone', (_event, _webContents, details) => {
    console.error('[closerai] render-process-gone:', details.reason, details.exitCode)
  })

  app.on('child-process-gone', (_event, details) => {
    console.error('[closerai] child-process-gone:', details.type, details.reason, details.exitCode)
  })

  app.on('open-url', (event, url) => {
    event.preventDefault()
    handleDeepLink(url)
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('before-quit', (event) => {
    if (quitting || dsh === null) return
    event.preventDefault()
    quitting = true
    void dsh.supervisor.stop().finally(() => app.quit())
  })

  void app.whenReady().then(boot)
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  main()
}
