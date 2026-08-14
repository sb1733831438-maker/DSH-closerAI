import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const source = join(here, '..', 'src', 'preload', 'index.cjs')
const targetDir = join(here, '..', 'dist', 'preload')
const target = join(targetDir, 'index.cjs')

mkdirSync(targetDir, { recursive: true })
copyFileSync(source, target)
console.log('preload -> dist/preload/index.cjs')
