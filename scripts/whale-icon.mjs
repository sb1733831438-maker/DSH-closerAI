import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
const require = createRequire(import.meta.url)
const [, , sharpDir, svgPath, outDir] = process.argv
const sharp = require(resolve(sharpDir, 'dist', 'index.cjs'))
const svg = readFileSync(svgPath)
mkdirSync(outDir, { recursive: true })
const sizes = [512, 256, 128, 48, 32, 16]
const jobs = sizes.map(async (s) => {
  const info = await sharp(svg)
    .resize(s, s)
    .png()
    .toFile(join(outDir, 'icon-' + s + '.png'))
  console.log('icon-' + s + '.png', info.width + 'x' + info.height, info.size, 'bytes')
  return info
})
await Promise.all(jobs)
writeFileSync(join(outDir, 'icon.png'), readFileSync(join(outDir, 'icon-512.png')))
console.log('primary ->', join(outDir, 'icon.png'))
