// License audit: walks the installed dependency tree (including pnpm's
// .pnpm virtual store) and prints TSV rows of name\tversion\tlicense\tkind,
// deduped by name@version. Used to generate THIRD_PARTY_NOTICES.md.
import { readdirSync, existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
import { join } from 'node:path'

const root = process.cwd()
const seen = new Map()
const counts = { total: 0, direct: 0, transitive: 0 }
const directNames = new Set(
  require(root + '/apps/desktop/package.json').dependencies
    ? Object.keys(require(root + '/apps/desktop/package.json').dependencies)
    : [],
)

function walk(dir, depth) {
  if (depth > 10) return
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  const pj = join(dir, 'package.json')
  if (existsSync(pj)) {
    try {
      const p = JSON.parse(readFileSync(pj, 'utf8'))
      if (p.name) {
        const key = p.name + '@' + p.version
        if (!seen.has(key)) {
          const kind = directNames.has(p.name) ? 'direct' : 'transitive'
          seen.set(key, { name: p.name, version: p.version, license: p.license || '', kind })
        }
      }
    } catch {
      /* unreadable package.json; skip */
    }
  }
  for (const e of entries) {
    if (
      e.name === '.bin' ||
      e.name === '.cache' ||
      e.name === '.package-lock.json' ||
      e.name === '.yarn-integrity'
    )
      continue
    if (e.isDirectory() && e.name !== 'node_modules' && e.name !== '.pnpm') {
      walk(join(dir, e.name), depth + 1)
    } else if (e.isDirectory() && e.name === 'node_modules') {
      // walk node_modules dirs but avoid re-walking a package's own copy when it
      // is a symlink (lstat: symlink to package dirs). We recurse real dirs only.
      walk(join(dir, e.name), depth + 1)
    } else if (e.isDirectory() && e.name === '.pnpm') {
      walk(join(dir, e.name), depth + 1)
    }
  }
}

walk(root, 0)
const rows = [...seen.values()].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
for (const r2 of rows) {
  counts[r2.kind === 'direct' ? 'direct' : 'transitive']++
  counts.total++
  console.log(
    [
      r2.name || '?',
      r2.version || '?',
      String(r2.license || 'UNLICENSED').replace(/\s+/g, ' '),
      r2.kind,
    ].join('\t'),
  )
}
console.error(
  'TOTAL\t' + counts.total + '\tDIRECT\t' + counts.direct + '\tTRANSITIVE\t' + counts.transitive,
)
