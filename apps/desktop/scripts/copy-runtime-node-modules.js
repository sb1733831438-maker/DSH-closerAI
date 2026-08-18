// electron-builder afterPack hook: overlay a complete runtime node_modules
// (an npm flat install of @deepseek-ai/dsh, which has no symlinks and
// includes DSH's peer/optional plugins that electron-builder's collector
// drops) on top of the collected app node_modules. fs.cp force-merge keeps
// the main-process packages (@closerai/*, js-yaml) while overwriting the
// DSH tree with the complete one.
// Source passed via env CLOSERAI_RUNTIME_NODE_MODULES.
import { cp } from 'node:fs/promises'
import { join } from 'node:path'

export async function afterPack(context) {
  const source = process.env.CLOSERAI_RUNTIME_NODE_MODULES
  if (source === undefined || source.length === 0) {
    throw new Error('CLOSERAI_RUNTIME_NODE_MODULES must point at the runtime node_modules')
  }
  const target = join(context.appOutDir, 'resources', 'app', 'node_modules')
  // merge/overwrite into the existing tree (keeps @closerai, js-yaml, ...)
  await cp(source, target, { recursive: true, force: true })
}
