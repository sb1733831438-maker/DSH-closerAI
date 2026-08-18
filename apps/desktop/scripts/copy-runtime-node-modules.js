// electron-builder afterPack hook: replace the collected (partial)
// node_modules with a complete runtime tree produced by pnpm deploy.
// pnpm's isolated layout (the .pnpm virtual store) is what the DSH runtime
// needs to resolve its transitive deps; electron-builder's node collector
// flattens and drops those, so we overwrite them wholesale.
// Source passed via env CLOSERAI_RUNTIME_NODE_MODULES.
import { cp, rm } from 'node:fs/promises'
import { join } from 'node:path'

export async function afterPack(context) {
  const source = process.env.CLOSERAI_RUNTIME_NODE_MODULES
  if (source === undefined || source.length === 0) {
    throw new Error('CLOSERAI_RUNTIME_NODE_MODULES must point at the runtime node_modules')
  }
  const target = join(context.appOutDir, 'resources', 'app', 'node_modules')
  await rm(target, { recursive: true, force: true })
  await cp(source, target, { recursive: true })
}
