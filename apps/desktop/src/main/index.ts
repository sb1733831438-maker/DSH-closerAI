import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { app, Menu, type BrowserWindow, type MenuItemConstructorOptions } from 'electron'
import { launchBackend, type RunningBackend } from './backend.js'
import { DEEP_LINK_SCHEME, parseDeepLink } from './deep-link.js'
import { applyProjectToConfig, registerIpcHandlers } from './ipc.js'
import { AppConfigStore } from './mode-store.js'
import { MOCK_DEFAULT } from './providers.js'
import { ProviderStoreFile } from './provider-store.js'
import { ProjectStore } from './project-store.js'
import { createSafeStorageCipher } from './safe-storage-cipher.js'
import { SecretStore } from './secrets.js'
import { SessionStore } from './session-store.js'
import { createWindow } from './window.js'

const isSmokeTest = process.argv.includes('--smoke-test')
const here = dirname(fileURLToPath(import.meta.url))
const onboardingPath = join(here, '..', 'renderer', 'index.html')

function main(): void {
  let window: BrowserWindow | null = null
  let backend: RunningBackend | null = null
  let quitting = false

  const userData = app.getPath('userData')
  const providerStore = new ProviderStoreFile(join(userData, 'providers.json'))
  const configStore = new AppConfigStore(join(userData, 'app-config.json'))
  const projectStore = new ProjectStore(join(userData, 'projects.json'))
  const dshHome = join(userData, 'dsh-home')
  const sessionStore = new SessionStore(join(dshHome, 'sessions'))
  let secretStore: SecretStore | null = null

  const getSecretStore = (): SecretStore => {
    // safeStorage requires the app to be ready; construct on first use.
    if (secretStore === null) {
      secretStore = new SecretStore(join(userData, 'secrets.bin'), createSafeStorageCipher())
    }
    return secretStore
  }

  const workspaceDirFor = (): string => {
    const config = configStore.read()
    if (config.mode === 'code' && config.workspaceDir !== null) return config.workspaceDir
    return join(userData, config.mode === 'work' ? 'work-sandbox' : 'workspace')
  }

  const focusWindow = (): void => {
    if (window === null || window.isDestroyed()) return
    if (window.isMinimized()) window.restore()
    window.focus()
  }

  const showManagePage = (): void => {
    if (window === null || window.isDestroyed()) return
    focusWindow()
    void window.loadFile(onboardingPath, { query: { view: 'manage' } })
  }

  const showChat = (): void => {
    if (window === null || window.isDestroyed()) return
    focusWindow()
    if (backend !== null && !window.isDestroyed()) void window.loadURL(backend.dsh.url)
  }

  const handleDeepLink = (link: string): void => {
    const parsed = parseDeepLink(link)
    if (parsed === null) return
    if (parsed.action === 'manage') showManagePage()
    else if (parsed.action === 'chat') showChat()
    else focusWindow()
  }

  const setTarget = (
    target: { kind: 'url'; url: string } | { kind: 'file'; path: string },
  ): void => {
    if (window === null || window.isDestroyed()) window = createWindow(target)
    else if (target.kind === 'url') void window.loadURL(target.url)
    else void window.loadFile(target.path)
  }

  const stopBackend = async (): Promise<void> => {
    const current = backend
    backend = null
    if (current === null) return
    await current.dsh.supervisor.stop()
    if (current.mockServer !== null) await current.mockServer.close()
  }

  const showOnboarding = (): void => {
    setTarget({ kind: 'file', path: onboardingPath })
  }

  const startBackendForActiveProfile = async (): Promise<void> => {
    const profile = providerStore.getActive()
    if (profile === null) {
      showOnboarding()
      return
    }
    const apiKey = getSecretStore().get(profile.id) ?? ''
    const mode = configStore.read().mode
    await stopBackend()
    const running = await launchBackend({
      home: dshHome,
      profile,
      apiKey,
      mode,
      workspaceDir: workspaceDirFor(),
    })
    backend = running

    running.dsh.supervisor.on('ready', (status) => {
      if (status.url !== null && window !== null && !window.isDestroyed()) {
        void window.loadURL(status.url)
      }
    })
    running.dsh.supervisor.on('failed', (error) => {
      console.error('[closerai] DSH failed:', error.message)
    })

    setTarget({ kind: 'url', url: running.dsh.url })

    if (isSmokeTest) {
      window!.webContents.once('did-finish-load', async () => {
        const rootChildren = await window!.webContents.executeJavaScript(
          "document.getElementById('root')?.childElementCount ?? 0",
        )
        const title = await window!.webContents.executeJavaScript('document.title')
        console.log(
          `[closerai] smoke: loaded ${running.dsh.url} title="${title}" rootChildren=${rootChildren}`,
        )
        const ok = typeof rootChildren === 'number' && rootChildren > 0
        await stopBackend()
        app.exit(ok ? 0 : 1)
      })
      window!.webContents.once('did-fail-load', async (_event, code, description) => {
        console.error(`[closerai] smoke: failed to load (${code}) ${description}`)
        await stopBackend()
        app.exit(1)
      })
    }
  }

  const installMenu = (): void => {
    const template: MenuItemConstructorOptions[] = [
      {
        label: 'CloserAI',
        submenu: [
          { label: '工作区与历史', accelerator: 'CmdOrCtrl+Shift+M', click: showManagePage },
          { label: '返回对话', accelerator: 'CmdOrCtrl+Shift+C', click: showChat },
          { type: 'separator' },
          { role: 'quit', label: '退出' },
        ],
      },
      {
        label: '编辑',
        submenu: [
          { role: 'undo', label: '撤销' },
          { role: 'redo', label: '重做' },
          { type: 'separator' },
          { role: 'cut', label: '剪切' },
          { role: 'copy', label: '复制' },
          { role: 'paste', label: '粘贴' },
          { role: 'selectAll', label: '全选' },
        ],
      },
      {
        label: '视图',
        submenu: [
          { role: 'reload', label: '刷新' },
          { role: 'toggleDevTools', label: '开发者工具' },
          { type: 'separator' },
          { role: 'resetZoom', label: '重置缩放' },
          { role: 'zoomIn', label: '放大' },
          { role: 'zoomOut', label: '缩小' },
          { type: 'separator' },
          { role: 'togglefullscreen', label: '全屏' },
        ],
      },
    ]
    Menu.setApplicationMenu(Menu.buildFromTemplate(template))
  }

  const boot = async (): Promise<void> => {
    // Restart recovery: an activated project's mode/workspace is re-applied to
    // the AppConfig before the backend boots, so relaunching drops the user
    // back into the same project/workspace as last time.
    applyProjectToConfig(configStore, projectStore)

    registerIpcHandlers({
      providerStore,
      secretStore: getSecretStore(),
      configStore,
      projectStore,
      sessionStore,
      workspaceDir: workspaceDirFor,
      backendUrl: () => (backend === null ? null : backend.dsh.url),
      showChat,
      showManage: showManagePage,
      onComplete: () => {
        void startBackendForActiveProfile()
      },
    })

    installMenu()

    if (isSmokeTest && providerStore.getActive() === null) {
      // Phase 1: the onboarding UI must mount from a clean state, then the
      // mock profile drives the full backend + DSH UI path unattended.
      showOnboarding()
      window!.webContents.once('did-finish-load', async () => {
        const mounted = await window!.webContents.executeJavaScript(
          "document.getElementById('root')?.childElementCount ?? 0",
        )
        console.log(`[closerai] smoke: onboarding mounted rootChildren=${mounted}`)
        if (mounted <= 0) {
          app.exit(1)
          return
        }
        providerStore.saveProfile(MOCK_DEFAULT)
        getSecretStore().set(MOCK_DEFAULT.id, 'smoke-key')
        try {
          await startBackendForActiveProfile()
        } catch (error) {
          console.error('[closerai] boot failed:', error instanceof Error ? error.message : error)
          app.exit(1)
        }
      })
      return
    }

    try {
      await startBackendForActiveProfile()
    } catch (error) {
      console.error('[closerai] boot failed:', error instanceof Error ? error.message : error)
      app.exit(1)
    }
  }

  app.on('second-instance', (_event, argv) => {
    const link = argv.find((arg) => arg.startsWith(`${DEEP_LINK_SCHEME}://`))
    if (link !== undefined) handleDeepLink(link)
    else focusWindow()
  })

  app.on('render-process-gone', (_event, _webContents, details) => {
    console.error('[closerai] render-process-gone:', details.reason, details.exitCode)
  })

  app.on('open-url', (event, url) => {
    event.preventDefault()
    handleDeepLink(url)
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('before-quit', (event) => {
    if (quitting || backend === null) return
    event.preventDefault()
    quitting = true
    void stopBackend().finally(() => app.quit())
  })

  void app.whenReady().then(boot)
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  main()
}
