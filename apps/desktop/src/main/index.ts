import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { app, Menu, type BrowserWindow, type MenuItemConstructorOptions } from 'electron'
import { launchBackend, type RunningBackend } from './backend.js'
import { CapabilitiesStore } from './capabilities.js'
import { DEEP_LINK_SCHEME, parseDeepLink } from './deep-link.js'
import { applyProjectToConfig, registerIpcHandlers } from './ipc.js'
import { AppConfigStore } from './mode-store.js'
import { MOCK_DEFAULT } from './providers.js'
import { ProviderStoreFile } from './provider-store.js'
import { ProjectStore } from './project-store.js'
import { createSafeStorageCipher } from './safe-storage-cipher.js'
import { SecretStore } from './secrets.js'
import { SessionStore } from './session-store.js'
import { clearStaleTaskBoardLock, describeDshStartFailure, resolveDshHome } from './dsh-home.js'
import electronUpdater from 'electron-updater'
const { autoUpdater } = electronUpdater
import { createUpdateController, type UpdaterLike } from './update.js'
import {
  applyLaunchAtLogin,
  createTray,
  destroyTray,
  getLaunchAtLogin,
  notify,
  updateTrayMenu,
  type TrayDeps,
} from './tray.js'
import { createWindow } from './window.js'

const isSmokeTest = process.argv.includes('--smoke-test')
const here = dirname(fileURLToPath(import.meta.url))
const onboardingPath = join(here, '..', 'renderer', 'index.html')

function main(): void {
  let window: BrowserWindow | null = null
  let backend: RunningBackend | null = null
  let quitting = false
  let trayCreated = false
  let hasBeenReady = false

  const userData = app.getPath('userData')
  const providerStore = new ProviderStoreFile(join(userData, 'providers.json'))
  const configStore = new AppConfigStore(join(userData, 'app-config.json'))
  const projectStore = new ProjectStore(join(userData, 'projects.json'))
  const capabilitiesStore = new CapabilitiesStore(join(userData, 'capabilities.json'))
  const resolvedHome = isSmokeTest
    ? { home: join(app.getPath('temp'), 'closerai-smoke-' + process.pid), mode: 'managed' as const }
    : resolveDshHome(userData)
  const updateController = createUpdateController({
    updater: autoUpdater as unknown as UpdaterLike,
    isPackaged: () => app.isPackaged,
  })
  const dshHome = resolvedHome.home
  const dshMode = resolvedHome.mode
  let secretStore: SecretStore | null = null
  const sessionStore = new SessionStore(join(dshHome, 'sessions'))

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

  const ensureWindow = (): BrowserWindow => {
    if (window === null || window.isDestroyed()) {
      window = createWindow({ kind: 'file', path: onboardingPath })
    }
    return window
  }

  const showManagePage = (): void => {
    const win = ensureWindow()
    focusWindow()
    void win.loadFile(onboardingPath, { query: { view: 'manage' } })
  }

  const showChat = (): void => {
    const win = ensureWindow()
    focusWindow()
    if (backend !== null) void win.loadURL(backend.dsh.url)
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
    await stopBackend()
    let running: RunningBackend | null = null
    if (dshMode === 'system-sync') {
      // Boot the user's own DSH untouched: shared sessions, profiles, plugins
      // and settings from their web DSH. CloserAI never writes into it. If the
      // home is already owned (e.g. the web DSH is running), stay open and tell
      // the user what to do instead of crashing.
      let bootError: unknown = null
      try {
        running = await launchBackend({
          home: dshHome,
          profile: null,
          apiKey: '',
          mode: null,
          workspaceDir: homedir(),
          manage: false,
        })
      } catch (error) {
        bootError = error
        // Self-heal: a stale task-board ledger lock (owner process dead) left
        // behind by a crash bricks the shared home for both desktop and web;
        // clear it and retry once.
        if (describeDshStartFailure(error) !== null && (await clearStaleTaskBoardLock(dshHome))) {
          console.log('[closerai] cleared stale task-board lock; retrying system-sync boot')
          try {
            running = await launchBackend({
              home: dshHome,
              profile: null,
              apiKey: '',
              mode: null,
              workspaceDir: homedir(),
              manage: false,
            })
            bootError = null
          } catch (retryError) {
            bootError = retryError
          }
        }
      }
      if (bootError !== null) {
        console.error(
          '[closerai] system-sync boot failed:',
          bootError instanceof Error ? bootError.message : bootError,
        )
        notify(
          'CloserAI — 无法启动系统 DSH',
          describeDshStartFailure(bootError) ?? 'DSH 启动失败，请查看诊断信息后重试。',
        )
        return
      }
    } else {
      const profile = providerStore.getActive()
      if (profile === null) {
        showOnboarding()
        return
      }
      const apiKey = getSecretStore().get(profile.id) ?? ''
      const mode = configStore.read().mode
      running = await launchBackend({
        home: dshHome,
        profile,
        apiKey,
        mode,
        workspaceDir: workspaceDirFor(),
        capabilities: capabilitiesStore.read(),
      })
    }
    if (running === null) return
    backend = running

    running.dsh.supervisor.on('ready', (status) => {
      if (hasBeenReady) {
        notify('CloserAI — 对话后端已就绪', 'DSH 已重新启动，可以继续对话。')
      }
      hasBeenReady = true
      if (status.url !== null && window !== null && !window.isDestroyed()) {
        void window.loadURL(status.url)
      }
    })
    running.dsh.supervisor.on('failed', (error) => {
      console.error('[closerai] DSH failed:', error.message)
      notify('CloserAI — DSH 已停止', error.message)
    })

    setTarget({ kind: 'url', url: running.dsh.url })

    if (isSmokeTest) {
      window!.webContents.once('did-finish-load', async () => {
        const rootChildren = await window!.webContents.executeJavaScript(
          "document.getElementById('root')?.childElementCount ?? 0",
        )
        const title = await window!.webContents.executeJavaScript('document.title')
        console.log(
          '[closerai] smoke: loaded ' +
            running.dsh.url +
            ' title="' +
            title +
            '" rootChildren=' +
            rootChildren,
        )
        const chatOk = typeof rootChildren === 'number' && rootChildren > 0
        if (!chatOk) {
          await stopBackend()
          app.exit(1)
          return
        }
        // v0.0.5: the management (workspace & history) page must also mount.
        try {
          // loadFile resolves once the page finishes loading; a separate
          // did-finish-load wait here would race and hang.
          await window!.loadFile(onboardingPath, { query: { view: 'manage' } })
          const manageChildren = await window!.webContents.executeJavaScript(
            "document.getElementById('root')?.childElementCount ?? 0",
          )
          const manageTitle = await window!.webContents.executeJavaScript('document.title')
          // getAppState() is async over IPC; poll briefly for the real content
          // (the manage heading) instead of racing the initial "加载中…" frame.
          let manageHasContent = false
          for (let attempt = 0; attempt < 50 && !manageHasContent; attempt += 1) {
            manageHasContent =
              (await window!.webContents.executeJavaScript(
                "document.body.innerText.includes('CloserAI 工作区')",
              )) === true
            if (!manageHasContent) await new Promise((resolve) => setTimeout(resolve, 100))
          }
          console.log(
            '[closerai] smoke: manage page title="' +
              manageTitle +
              '" rootChildren=' +
              manageChildren +
              ' content=' +
              manageHasContent,
          )
          const manageOk =
            typeof manageChildren === 'number' && manageChildren > 0 && manageHasContent === true
          await stopBackend()
          app.exit(manageOk ? 0 : 1)
        } catch (error) {
          console.error('[closerai] smoke: manage page failed:', error)
          await stopBackend()
          app.exit(1)
        }
      })
      window!.webContents.once('did-fail-load', async (_event, code, description) => {
        console.error('[closerai] smoke: failed to load (' + code + ') ' + description)
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

    const trayDeps: TrayDeps = {
      onOpenChat: showChat,
      onOpenManage: showManagePage,
      onQuit: () => {
        quitting = true
        destroyTray()
        app.quit()
      },
      getLaunchAtLogin: () => getLaunchAtLogin(),
      setLaunchAtLogin: (enabled) => {
        const config = configStore.read()
        configStore.write({ ...config, launchAtLogin: enabled })
        applyLaunchAtLogin(enabled)
        if (trayCreated) updateTrayMenu(trayDeps)
      },
    }

    registerIpcHandlers({
      providerStore,
      secretStore: getSecretStore(),
      configStore,
      projectStore,
      sessionStore,
      capabilitiesStore,
      workspaceDir: workspaceDirFor,
      backendUrl: () => (backend === null ? null : backend.dsh.url),
      showChat,
      showManage: showManagePage,
      diagnosticsLogs: () => (backend === null ? [] : backend.dsh.supervisor.logs.entries()),
      supervisorStatus: () =>
        backend === null
          ? { state: 'idle', pid: null }
          : { state: backend.dsh.supervisor.getState(), pid: backend.dsh.supervisor.getPid() },
      getLaunchAtLogin: () => getLaunchAtLogin(),
      setLaunchAtLogin: (enabled) => {
        const config = configStore.read()
        configStore.write({ ...config, launchAtLogin: enabled })
        applyLaunchAtLogin(enabled)
        if (trayCreated) updateTrayMenu(trayDeps)
      },
      onComplete: () => {
        void startBackendForActiveProfile()
      },
      dshMode,
      updateController,
    })

    installMenu()

    trayCreated = createTray(trayDeps) !== null

    if (isSmokeTest && providerStore.getActive() === null) {
      // Phase 1: the onboarding UI must mount from a clean state, then the
      // mock profile drives the full backend + DSH UI path unattended.
      showOnboarding()
      window!.webContents.once('did-finish-load', async () => {
        const mounted = await window!.webContents.executeJavaScript(
          "document.getElementById('root')?.childElementCount ?? 0",
        )
        console.log('[closerai] smoke: onboarding mounted rootChildren=' + mounted)
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
    const link = argv.find((arg) => arg.startsWith(DEEP_LINK_SCHEME + '://'))
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
    // Native desktop behavior: when the tray exists, closing the window keeps
    // the app running in the background instead of quitting.
    if (trayCreated && !quitting) return
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
