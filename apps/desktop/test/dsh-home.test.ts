import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resolveDshHome } from '../src/main/dsh-home.js'

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

  it('treats an explicit home equal to the system home as system-sync', () => {
    mkdirSync(systemHome, { recursive: true })
    process.env.CLOSERAI_DSH_HOME = systemHome
    const resolved = resolveDshHome(userData, systemHome)
    expect(resolved.mode).toBe('system-sync')
  })
})
