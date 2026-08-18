// electron-builder afterPack hook: replace the collected (partial)
// node_modules with the complete production tree produced by pnpm deploy.
// electron-builder's node collector drops DSH's peer/optional plugins, so we
// overwrite the packaged node_modules with the full deploy tree. On Linux CI
// (symlinks available) we dereference so the result is self-contained.
// Source passed via env CLOSERAI_RUNTIME_NODE_MODULES.
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

export async function afterPack(context) {
  const source = process.env.CLOSERAI_RUNTIME_NODE_MODULES
  if (source === undefined || source.length === 0) {
    throw new Error('CLOSERAI_RUNTIME_NODE_MODULES must point at the runtime node_modules')
  }
  const target = join(context.appOutDir, 'resources', 'app', 'node_modules')
  rmSync(target, { recursive: true, force: true })
  mkdirSync(target, { recursive: true })
  // dereference symlinks so the packaged tree is self-contained (Linux-safe)
  execFileSync('cp', ['-rL', source + '/.', target + '/'], { stdio: 'inherit' })
}
