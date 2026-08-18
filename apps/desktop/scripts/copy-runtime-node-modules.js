// electron-builder afterPack hook: replace the collected (partial)
// node_modules with the complete production tree produced by pnpm deploy.
// electron-builder's node collector drops DSH's peer/optional plugins, so we
// overwrite the packaged node_modules with the full deploy tree. On Linux CI
// (symlinks available) we dereference so the result is self-contained.
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
  // tar -h dereferences symlinks; avoids cp 'copy directory into itself'
  const srcParent = dirname(source)
  const tgtParent = dirname(target)
  execFileSync(
    'bash',
    [
      '-c',
      "cd '" + srcParent + "' && tar -h -cf - node_modules | (cd '" + tgtParent + "' && tar -xf -)",
    ],
    { stdio: 'inherit' },
  )
}
