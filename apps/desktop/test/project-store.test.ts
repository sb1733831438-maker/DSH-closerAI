import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ProjectStore } from '../src/main/project-store.js'

let dir: string
let file: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'closerai-projects-'))
  file = join(dir, 'projects.json')
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('ProjectStore', () => {
  it('returns empty defaults when the file does not exist', () => {
    const store = new ProjectStore(file)
    expect(store.read()).toEqual({ activeProjectId: null, projects: [] })
    expect(store.list()).toEqual([])
    expect(store.getActive()).toBeNull()
  })

  it('creates a project, auto-activating the first one', () => {
    const store = new ProjectStore(file)
    const project = store.create({ name: 'My App', mode: 'code', workspaceDir: 'C:\\work\\my-app' })
    expect(project.name).toBe('My App')
    expect(project.mode).toBe('code')
    expect(project.workspaceDir).toBe('C:\\work\\my-app')
    expect(store.getActive()?.id).toBe(project.id)
  })

  it('persists data to disk and round-trips', () => {
    const store = new ProjectStore(file)
    const a = store.create({ name: 'A', mode: 'chat' })
    store.create({ name: 'B', mode: 'work' })

    const reloaded = new ProjectStore(file)
    expect(reloaded.list()).toHaveLength(2)
    expect(reloaded.getActive()?.id).toBe(a.id)
    // JSON on disk is parseable
    expect(() => JSON.parse(readFileSync(file, 'utf8'))).not.toThrow()
  })

  it('updates a project in place', () => {
    const store = new ProjectStore(file)
    const project = store.create({ name: 'Old', mode: 'chat' })
    const updated = { ...project, name: 'New', mode: 'code' as const, workspaceDir: 'D:\\repo' }
    store.update(updated)
    expect(store.list()[0]).toMatchObject({ name: 'New', mode: 'code', workspaceDir: 'D:\\repo' })
    expect(store.list()[0]!.updatedAt).toBeGreaterThanOrEqual(project.updatedAt)
  })

  it('rejects updating an unknown project', () => {
    const store = new ProjectStore(file)
    expect(() =>
      store.update({
        id: 'nope',
        name: 'x',
        mode: 'chat',
        workspaceDir: null,
        createdAt: 1,
        updatedAt: 1,
      }),
    ).toThrow('not found')
  })

  it('removes a project and clears the active id', () => {
    const store = new ProjectStore(file)
    const a = store.create({ name: 'A', mode: 'chat' })
    const b = store.create({ name: 'B', mode: 'work' })
    store.setActive(b.id)
    store.remove(b.id)
    expect(store.list().map((p) => p.id)).toEqual([a.id])
    expect(store.getActive()).toBeNull()
  })

  it('setActive switches and validates', () => {
    const store = new ProjectStore(file)
    store.create({ name: 'A', mode: 'chat' })
    const b = store.create({ name: 'B', mode: 'work' })
    store.setActive(b.id)
    expect(store.getActive()?.id).toBe(b.id)
    store.setActive(null)
    expect(store.getActive()).toBeNull()
    expect(() => store.setActive('missing')).toThrow('not found')
  })

  it('tolerates unknown fields in a stored file (forward compat)', () => {
    writeFileSync(
      file,
      JSON.stringify({
        activeProjectId: null,
        projects: [],
        future: true,
      }),
      'utf8',
    )
    const store = new ProjectStore(file)
    expect(store.list()).toEqual([])
  })

  it('drops malformed project records from a stored file', () => {
    writeFileSync(
      file,
      JSON.stringify({
        activeProjectId: null,
        projects: [{ id: 42, name: 'bad' }],
      }),
      'utf8',
    )
    const store = new ProjectStore(file)
    expect(store.list()).toEqual([])
  })
})
