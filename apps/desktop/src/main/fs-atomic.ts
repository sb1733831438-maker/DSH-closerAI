import { mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'

/**
 * Atomically write `data` to `targetPath`: write a sibling temp file first,
 * then rename it over the target. A crash or power loss mid-write leaves the
 * previous file intact instead of a truncated / corrupt JSON, so a restart
 * never fails to parse the app stores (REVIEW R-03).
 *
 * `renameSync` within the same directory is atomic on both POSIX and Windows
 * (MoveFileEx semantics), which is what makes the reader always see either the
 * old or the new complete file, never a partial one.
 */
export function atomicWriteFileSync(targetPath: string, data: string, mode?: number): void {
  const dir = dirname(targetPath)
  mkdirSync(dir, { recursive: true })
  const tempPath = join(dir, `.${basename(targetPath)}.${process.pid}.tmp`)
  try {
    if (mode === undefined) {
      writeFileSync(tempPath, data, 'utf8')
    } else {
      writeFileSync(tempPath, data, { encoding: 'utf8', mode })
    }
    renameSync(tempPath, targetPath)
  } catch (error) {
    try {
      rmSync(tempPath, { force: true })
    } catch {
      // best-effort cleanup of the temp file
    }
    throw error
  }
}
