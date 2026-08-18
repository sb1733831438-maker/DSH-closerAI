// electron-builder afterPack hook: replace the collected (partial)
// node_modules with the complete runtime tree produced by an npm flat
// install (@deepseek-ai/dsh + @closerai/* file links). npm's flat layout has
// no symlinks (Windows-safe) and includes DSH's peer/optional plugins that
// electron-builder's collector drops; a plain cp -r is therefore fast.
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
  execFileSync('cp', ['-r', source, target], { stdio: 'inherit' })
}
