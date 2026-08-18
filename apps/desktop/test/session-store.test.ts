import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SessionStore, workspaceKeyFromPath } from '../src/main/session-store.js'

const ID_A = 'session-11111111-1111-4111-8111-111111111111'
const ID_B = 'session-22222222-2222-4222-8222-222222222222'
const ID_C = 'session-33333333-3333-4333-8333-333333333333'

let root: string

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'closerai-sessions-'))
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

function makeSession(workspaceKey: string, id: string, content = '{}'): string {
  const dir = join(root, workspaceKey, id)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'session.jsonl.zstd'), content, 'utf8')
  return dir
}

describe('workspaceKeyFromPath', () => {
  it('encodes a path like DSH workspace dir names', () => {
    expect(workspaceKeyFromPath('D:\\Dev\\app')).toBe('--D-Dev-app--')
    // POSIX: the leading '/' is replaced too, matching the naive DSH transform
  })
})

describe('SessionStore.list', () => {
  it('returns [] when the sessions root does not exist', async () => {
    const store = new SessionStore(join(root, 'missing'))
    await expect(store.list()).resolves.toEqual([])
  })

  it('discovers DSH session dirs with size and mtime metadata', async () => {
    const store = new SessionStore(root)
    makeSession('--w1--', ID_A, 'abc')
    makeSession('--w2--', ID_B, 'abcd')

    const entries = await store.list()
    expect(entries).toHaveLength(2)
    const byId = new Map(entries.map((e) => [e.id, e]))
    const one = byId.get(ID_A)!
    expect(one.workspaceKey).toBe('--w1--')
    expect(one.sizeBytes).toBe(3)
    expect(one.fileCount).toBe(1)
    expect(one.mtimeMs).toBeGreaterThan(0)
    // newest first
    expect(entries[0]!.mtimeMs).toBeGreaterThanOrEqual(entries[1]!.mtimeMs)
  })

  it('ignores non-session and record-less directories', async () => {
    const store = new SessionStore(root)
    makeSession('--w1--', ID_A)
    mkdirSync(join(root, '--w1--', 'random-folder'), { recursive: true })
    mkdirSync(join(root, '--w2--', 'session-deadbeef'), { recursive: true }) // no record file

    const entries = await store.list()
    expect(entries).toHaveLength(1)
    expect(entries[0]!.id).toBe(ID_A)
  })
})

describe('SessionStore.delete', () => {
  it('removes the session directory', async () => {
    const store = new SessionStore(root)
    makeSession('--w1--', ID_A)
    expect(await store.list()).toHaveLength(1)
    await store.delete(ID_A)
    expect(await store.list()).toHaveLength(0)
  })

  it('rejects invalid ids and unknown ids', async () => {
    const store = new SessionStore(root)
    await expect(store.delete('../outside')).rejects.toThrow('invalid session id')
    await expect(store.delete('session-99999999-9999-4999-8999-999999999999')).rejects.toThrow(
      'not found',
    )
  })
})

describe('SessionStore.exportTo', () => {
  it('copies the session directory into the destination', async () => {
    const store = new SessionStore(root)
    makeSession('--w1--', ID_A, 'record-bytes')
    const dest = join(root, '..', 'exports-' + Date.now())
    mkdirSync(dest, { recursive: true })
    try {
      const outDir = await store.exportTo(ID_A, dest)
      expect(readdirSync(outDir)).toContain('session.jsonl.zstd')
      expect(readFileSync(join(outDir, 'session.jsonl.zstd'), 'utf8')).toBe('record-bytes')
    } finally {
      rmSync(dest, { recursive: true, force: true })
    }
  })
})

describe('SessionStore.importFrom', () => {
  it('imports a session-<uuid> folder under a workspace key', async () => {
    const store = new SessionStore(root)
    const src = join(root, '..', ID_C)
    mkdirSync(src, { recursive: true })
    writeFileSync(join(src, 'session.jsonl.zstd'), 'imported', 'utf8')
    try {
      const target = await store.importFrom(src, '--imported--')
      expect(target).toBe(join(root, '--imported--', ID_C))
      expect(await store.list()).toHaveLength(1)
      expect((await store.list())[0]!.workspaceKey).toBe('--imported--')
    } finally {
      rmSync(src, { recursive: true, force: true })
    }
  })

  it('rejects a folder that is not named session-<uuid>', async () => {
    const store = new SessionStore(root)
    const src = join(root, '..', 'my-backup-' + Date.now())
    mkdirSync(src, { recursive: true })
    writeFileSync(join(src, 'session.jsonl.zstd'), 'x', 'utf8')
    try {
      await expect(store.importFrom(src, '--w--')).rejects.toThrow('must be named session-')
    } finally {
      rmSync(src, { recursive: true, force: true })
    }
  })

  it('refuses to overwrite an existing session record', async () => {
    const store = new SessionStore(root)
    makeSession('--w--', ID_A, 'old')
    const src = join(root, '..', ID_A)
    mkdirSync(src, { recursive: true })
    writeFileSync(join(src, 'session.jsonl.zstd'), 'new', 'utf8')
    try {
      await expect(store.importFrom(src, '--w--')).rejects.toThrow('already exists')
    } finally {
      rmSync(src, { recursive: true, force: true })
    }
  })
})
describe('SessionStore.list (RC disk-error hardening)', () => {
  it('ignores stray files at the sessions root', async () => {
    const store = new SessionStore(root)
    makeSession('--w1--', ID_A, 'abc')
    writeFileSync(join(root, 'stray-file.txt'), 'x', 'utf8')
    const entries = await store.list()
    expect(entries).toHaveLength(1)
  })

  it('still lists a session whose record file exists but is empty/corrupt', async () => {
    const store = new SessionStore(root)
    makeSession('--w1--', ID_A, '') // 0-byte record (crash mid-write)
    const entries = await store.list()
    expect(entries).toHaveLength(1)
    expect(entries[0]!.id).toBe(ID_A)
    expect(entries[0]!.sizeBytes).toBe(0)
  })

  it('survives a workspace directory that cannot be enumerated', async () => {
    const store = new SessionStore(root)
    makeSession('--w1--', ID_A, 'abc')
    // a workspace entry that looks like a directory but is actually a file:
    // readdir(workspaceDir) throws, list() must skip it, not fail
    writeFileSync(join(root, '--broken--'), 'not a dir', 'utf8')
    const entries = await store.list()
    expect(entries).toHaveLength(1)
    expect(entries[0]!.workspaceKey).toBe('--w1--')
  })
})
