// electron-builder afterPack hook: replace the collected (partial)
// node_modules with the complete production tree produced by pnpm deploy.
// electron-builder's node collector drops DSH's peer/optional plugins, so we
// overwrite the packaged node_modules with the full deploy tree. fs.cp with
// dereference materializes symlinks so the result is self-contained (no
// external binaries needed inside the container).
// Source passed via env CLOSERAI_RUNTIME_NODE_MODULES.
import { cp, mkdir, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export async function afterPack(context) {
  const source = process.env.CLOSERAI_RUNTIME_NODE_MODULES
  if (source === undefined || source.length === 0) {
    throw new Error('CLOSERAI_RUNTIME_NODE_MODULES must point at the runtime node_modules')
  }
  const target = join(context.appOutDir, 'resources', 'app', 'node_modules')
  await rm(target, { recursive: true, force: true })
  await mkdir(dirname(target), { recursive: true })
  await cp(source, target, { recursive: true, dereference: true })
}
