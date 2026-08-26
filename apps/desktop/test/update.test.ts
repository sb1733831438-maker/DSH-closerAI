import { describe, expect, it, vi } from 'vitest'
import { createUpdateController, type UpdaterLike } from '../src/main/update.js'

function makeUpdater() {
  const listeners = new Map<string, Array<(...args: unknown[]) => void>>()
  return {
    listeners,
    updater: {
      checkForUpdates: vi.fn(async () => {}),
      downloadUpdate: vi.fn(async () => {}),
      quitAndInstall: vi.fn(() => {}),
      on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
        listeners.set(event, [...(listeners.get(event) ?? []), cb])
      }),
    } as unknown as UpdaterLike,
    emit(event: string, ...args: unknown[]) {
      for (const cb of listeners.get(event) ?? []) cb(...args)
    },
  }
}

describe('createUpdateController', () => {
  it('reports disabled in dev/unpackaged builds and never checks', async () => {
    const m = makeUpdater()
    const c = createUpdateController({ updater: m.updater, isPackaged: () => false })
    expect(c.status().state).toBe('disabled')
    await c.check()
    expect(m.updater.checkForUpdates).not.toHaveBeenCalled()
  })

  it('checks for updates and reports available with a version', async () => {
    const m = makeUpdater()
    const c = createUpdateController({ updater: m.updater, isPackaged: () => true })
    const promise = c.check()
    expect(c.status().state).toBe('checking')
    m.emit('update-available', { version: '1.2.3' })
    await promise
    expect(c.status()).toEqual({ state: 'available', version: '1.2.3' })
  })

  it('reports up-to-date when no update exists', async () => {
    const m = makeUpdater()
    const c = createUpdateController({ updater: m.updater, isPackaged: () => true })
    const promise = c.check()
    m.emit('update-not-available')
    await promise
    expect(c.status()).toEqual({ state: 'up-to-date' })
  })

  it('reports download progress and downloaded state', async () => {
    const m = makeUpdater()
    const c = createUpdateController({ updater: m.updater, isPackaged: () => true })
    m.emit('download-progress', { percent: 42 })
    expect(c.status()).toEqual({ state: 'downloading', percent: 42 })
    m.emit('update-downloaded', { version: '1.2.3' })
    expect(c.status()).toEqual({ state: 'downloaded', version: '1.2.3' })
  })

  it('maps updater errors to a friendly error status', async () => {
    const m = makeUpdater()
    const c = createUpdateController({ updater: m.updater, isPackaged: () => true })
    m.emit('error', new Error('boom'))
    expect(c.status()).toEqual({ state: 'error', message: 'boom' })
  })

  it('quitAndInstall when a download is ready', async () => {
    const m = makeUpdater()
    const c = createUpdateController({ updater: m.updater, isPackaged: () => true })
    m.emit('update-downloaded', { version: '1.2.3' })
    await c.install()
    expect(m.updater.quitAndInstall).toHaveBeenCalled()
  })

  it('R-26: check() does not clobber a completed download', async () => {
    const m = makeUpdater()
    const c = createUpdateController({ updater: m.updater, isPackaged: () => true })
    m.emit('update-downloaded', { version: '1.2.3' })
    await c.check()
    expect(c.status()).toEqual({ state: 'downloaded', version: '1.2.3' })
    expect(m.updater.checkForUpdates).not.toHaveBeenCalled()
  })

  it('R-26: check() does not clobber an in-flight download', async () => {
    const m = makeUpdater()
    const c = createUpdateController({ updater: m.updater, isPackaged: () => true })
    m.emit('download-progress', { percent: 50 })
    await c.check()
    expect(c.status()).toEqual({ state: 'downloading', percent: 50 })
    expect(m.updater.checkForUpdates).not.toHaveBeenCalled()
  })

  it('R-28: install() stops the backend before quitAndInstall', async () => {
    const m = makeUpdater()
    const order: string[] = []
    const c = createUpdateController({
      updater: m.updater,
      isPackaged: () => true,
      beforeQuitAndInstall: async () => {
        order.push('stop-backend')
      },
    })
    m.updater.quitAndInstall = vi.fn(() => {
      order.push('quit-and-install')
    })
    m.emit('update-downloaded', { version: '1.2.3' })
    await c.install()
    expect(order).toEqual(['stop-backend', 'quit-and-install'])
    expect(m.updater.quitAndInstall).toHaveBeenCalled()
  })
})
