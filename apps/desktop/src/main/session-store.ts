import { copyFile, mkdir, readdir, rm, stat } from 'node:fs/promises'
import type { Dirent } from 'node:fs'
import { basename, join, resolve, sep } from 'node:path'
import type { SessionEntry } from '../shared/types.js'

/**
 * File-level access to DSH's native session store under
 * `$DSH_HOME/sessions/<workspaceKey>/session-<uuid>/`.
 *
 * DSH owns the session contents (`.jsonl.zstd`); CloserAI only inspects the
 * directory layout and performs whole-session file operations (list, delete,
 * export, import). All paths are validated to stay inside the sessions root so
 * a renderer-facing id can never be turned into an arbitrary file delete.
 */
const SESSION_NAME_RE = /^session-[0-9a-f-]+$/i
const SESSION_RECORD_FILE = 'session.jsonl.zstd'

/** Encode an absolute path the way DSH names its workspace dirs, e.g.
 *  D:\\Dev\\app -> --D-Dev-app--. Used only to pick an import destination. */
export function workspaceKeyFromPath(input: string): string {
  const replaced = input.replace(/[\\/:]+/g, '-')
  return '--' + replaced + '--'
}

export class SessionStore {
  private readonly root: string

  constructor(sessionsRoot: string) {
    this.root = sessionsRoot
  }

  async list(): Promise<SessionEntry[]> {
    let top: Dirent<string>[]
    try {
      top = await readdir(this.root, { withFileTypes: true, encoding: 'utf8' })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
      throw error
    }

    const entries: SessionEntry[] = []
    for (const workspace of top) {
      if (!workspace.isDirectory()) continue
      const workspaceDir = join(this.root, workspace.name)
      let children: Dirent<string>[]
      try {
        children = await readdir(workspaceDir, { withFileTypes: true, encoding: 'utf8' })
      } catch {
        continue
      }
      for (const child of children) {
        if (!child.isDirectory() || !SESSION_NAME_RE.test(child.name)) continue
        const sessionDir = join(workspaceDir, child.name)
        try {
          await stat(join(sessionDir, SESSION_RECORD_FILE))
        } catch {
          // not a real DSH session (missing the record file); skip
          continue
        }
        let sizeBytes = 0
        let mtimeMs = 0
        let fileCount = 0
        for (const file of await readdir(sessionDir, { withFileTypes: true })) {
          if (!file.isFile()) continue
          const fileStat = await stat(join(sessionDir, file.name))
          sizeBytes += fileStat.size
          mtimeMs = Math.max(mtimeMs, fileStat.mtimeMs)
          fileCount += 1
        }
        entries.push({
          id: child.name,
          workspaceKey: workspace.name,
          dir: sessionDir,
          sizeBytes,
          mtimeMs,
          fileCount,
        })
      }
    }

    return entries.sort((a, b) => b.mtimeMs - a.mtimeMs)
  }

  /** Resolve a session id to its directory, refusing anything outside the root. */
  async resolveDir(id: string): Promise<string> {
    if (!SESSION_NAME_RE.test(id)) throw new Error('invalid session id: ' + id)
    const found = (await this.list()).find((entry) => entry.id === id)
    if (found === undefined) throw new Error('session not found: ' + id)
    const resolved = resolve(found.dir)
    const rootResolved = resolve(this.root)
    if (resolved !== rootResolved && !resolved.startsWith(rootResolved + sep)) {
      throw new Error('session path escapes the sessions root: ' + resolved)
    }
    return resolved
  }

  async delete(id: string): Promise<void> {
    const dir = await this.resolveDir(id)
    await rm(dir, { recursive: true, force: true })
  }

  /** Copy a whole session directory into the given destination directory. */
  async exportTo(id: string, destDir: string): Promise<string> {
    const dir = await this.resolveDir(id)
    const target = join(destDir, basename(dir))
    await mkdir(target, { recursive: true })
    for (const file of await readdir(dir, { withFileTypes: true })) {
      if (!file.isFile()) continue
      await copyFile(join(dir, file.name), join(target, file.name))
    }
    return target
  }

  /**
   * Import a session directory (named session-<uuid>) under the given
   * workspace key inside the sessions root. Returns the new session dir.
   */
  async importFrom(srcDir: string, workspaceKey: string): Promise<string> {
    const srcResolved = resolve(srcDir)
    const name = basename(srcResolved)
    if (!SESSION_NAME_RE.test(name)) {
      throw new Error('imported folder must be named session-<uuid>, got ' + name)
    }
    const targetDir = join(this.root, workspaceKey, name)
    await mkdir(targetDir, { recursive: true })
    let copied = 0
    for (const file of await readdir(srcResolved, { withFileTypes: true })) {
      if (!file.isFile()) continue
      const from = join(srcResolved, file.name)
      const to = join(targetDir, file.name)
      if (file.name === SESSION_RECORD_FILE) {
        try {
          await stat(to)
          throw new Error('session record already exists at ' + to)
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
        }
      }
      await copyFile(from, to)
      copied += 1
    }
    if (copied === 0) throw new Error('nothing to import from ' + srcResolved)
    return targetDir
  }
}
