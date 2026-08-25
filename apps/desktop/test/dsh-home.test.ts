import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  clearStaleTaskBoardLock,
  describeDshStartFailure,
  resolveDshHome,
} from '../src/main/dsh-home.js'

let root: string
let systemHome: string
let userData: string

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'closerai-dshhome-'))
  systemHome = join(root, 'system-dsh')
  userData = join(root, 'userdata')
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
  delete process.env.CLOSERAI_DSH_HOME
  delete process.env.CLOSERAI_DSH_MODE
})

describe('resolveDshHome', () => {
  it('syncs with the system DSH home when it exists', () => {
    mkdirSync(systemHome, { recursive: true })
    const resolved = resolveDshHome(userData, systemHome)
    expect(resolved.home).toBe(systemHome)
    expect(resolved.mode).toBe('system-sync')
  })

  it('falls back to an isolated managed home when no system home exists', () => {
    const resolved = resolveDshHome(userData, systemHome)
    expect(resolved.home).toBe(join(userData, 'dsh-home'))
    expect(resolved.mode).toBe('managed')
  })

  it('prefers CLOSERAI_DSH_HOME and treats it as managed by default', () => {
    const custom = join(root, 'custom')
    process.env.CLOSERAI_DSH_HOME = custom
    const resolved = resolveDshHome(userData, systemHome)
    expect(resolved.home).toBe(custom)
    expect(resolved.mode).toBe('managed')
  })

  it('lets CLOSERAI_DSH_MODE=system-sync force sync mode on an explicit home', () => {
    const custom = join(root, 'custom')
    process.env.CLOSERAI_DSH_HOME = custom
    process.env.CLOSERAI_DSH_MODE = 'system-sync'
    const resolved = resolveDshHome(userData, systemHome)
    expect(resolved.home).toBe(custom)
    expect(resolved.mode).toBe('system-sync')
  })

  it('clears a stale task-board lock whose owner is dead', async () => {
    const home = join(root, 'home-with-lock')
    const lockDir = join(home, 'task-board')
    mkdirSync(lockDir, { recursive: true })
    writeFileSync(join(lockDir, 'ledger-v2.lock'), JSON.stringify({ pid: 999999, token: 't' }))
    const cleared = await clearStaleTaskBoardLock(home, () => false)
    expect(cleared).toBe(true)
    expect(existsSync(join(lockDir, 'ledger-v2.lock'))).toBe(false)
  })

  it('does not clear a lock whose owner is alive', async () => {
    const home = join(root, 'home-live-lock')
    const lockDir = join(home, 'task-board')
    mkdirSync(lockDir, { recursive: true })
    writeFileSync(join(lockDir, 'ledger-v2.lock'), JSON.stringify({ pid: 42, token: 't' }))
    const cleared = await clearStaleTaskBoardLock(home, () => true)
    expect(cleared).toBe(false)
    expect(existsSync(join(lockDir, 'ledger-v2.lock'))).toBe(true)
  })

  it('returns false when no lock file exists', async () => {
    const cleared = await clearStaleTaskBoardLock(join(root, 'empty-home'))
    expect(cleared).toBe(false)
  })

  it('maps the task-board single-owner lock to a friendly message', () => {
    const error = new Error(
      'dsh: plugin tree failed to load: task-board ledger is already owned by process 18240',
    )
    expect(describeDshStartFailure(error)).toContain('web 端 DSH')
  })

  it('returns null for an unknown failure', () => {
    expect(describeDshStartFailure(new Error('ENOENT: something else'))).toBeNull()
    expect(describeDshStartFailure('plain string')).toBeNull()
  })

  it('treats an explicit home equal to the system home as system-sync', () => {
    mkdirSync(systemHome, { recursive: true })
    process.env.CLOSERAI_DSH_HOME = systemHome
    const resolved = resolveDshHome(userData, systemHome)
    expect(resolved.mode).toBe('system-sync')
  })
})
