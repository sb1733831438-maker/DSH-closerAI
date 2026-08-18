// electron-builder afterPack hook: replace the collected (partial)
// node_modules with the complete production tree produced by pnpm deploy.
// electron-builder's node collector drops DSH's peer/optional plugins, so we
// overwrite the packaged node_modules with the full deploy tree. rsync -a -L
// dereferences symlinks so the packaged tree is self-contained for Windows.
// Source passed via env CLOSERAI_RUNTIME_NODE_MODULES.
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { mkdirSync, rmSync } from 'node:fs'

export async function afterPack(context) {
  const source = process.env.CLOSERAI_RUNTIME_NODE_MODULES
  if (source === undefined || source.length === 0) {
    throw new Error('CLOSERAI_RUNTIME_NODE_MODULES must point at the runtime node_modules')
  }
  const target = join(context.appOutDir, 'resources', 'app', 'node_modules')
  rmSync(target, { recursive: true, force: true })
  mkdirSync(dirname(target), { recursive: true })
  // rsync -a -L: archive mode, dereference symlinks; no cp 'into itself' check
  execFileSync('rsync', ['-a', '-L', source + '/', target + '/'], { stdio: 'inherit' })
}
