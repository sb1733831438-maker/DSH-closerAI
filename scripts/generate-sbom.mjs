// Supply-chain gate: enumerate the installed dependency tree (pnpm .pnpm
// virtual store included) and emit a CycloneDX 1.5 JSON SBOM. Fails (exit 1)
// when any component has no declared license, unless it is allow-listed.
import { readdirSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const root = process.cwd()
const seen = new Map()
const desktopPkg = require(root + '/apps/desktop/package.json')
const directNames = new Set(desktopPkg.dependencies ? Object.keys(desktopPkg.dependencies) : [])

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
      // Only real npm packages carry a version; subpath shims (e.g.
      // @google/genai/node, web-streams-polyfill build folders) do not.
      if (p.name && p.version) {
        const key = p.name + '@' + p.version
        if (!seen.has(key)) {
          seen.set(key, {
            name: p.name,
            version: p.version,
            license: p.license || '',
            kind: directNames.has(p.name) ? 'direct' : 'transitive',
          })
        }
      }
    } catch {
      /* skip */
    }
  }
  for (const e of entries) {
    if (['.bin', '.cache', '.package-lock.json', '.yarn-integrity'].includes(e.name)) continue
    if (e.isDirectory() && ['node_modules', '.pnpm'].includes(e.name)) {
      walk(join(dir, e.name), depth + 1)
    } else if (e.isDirectory() && e.name !== 'node_modules') {
      walk(join(dir, e.name), depth + 1)
    }
  }
}

walk(root, 0)

const components = [...seen.values()]
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((c) => {
    const component = {
      type: 'library',
      'bom-ref': c.name + '@' + c.version,
      name: c.name,
      version: c.version,
      purl: 'pkg:npm/' + c.name + '@' + c.version,
    }
    const licenseId = (c.license || '').split(/\s+/)[0].replace(/[()]/g, '')
    if (licenseId && licenseId !== 'UNLICENSED') {
      component.licenses = [{ license: { id: licenseId } }]
    }
    return component
  })

const unlicensed = components.filter((c) => !c.licenses)
if (unlicensed.length > 0) {
  console.error('SBOM gate FAILED — components without a declared license:')
  for (const c of unlicensed.slice(0, 20)) console.error('  ' + c.name + '@' + c.version)
  console.error('  (' + unlicensed.length + ' total)')
  process.exit(1)
}

const bom = {
  bomFormat: 'CycloneDX',
  specVersion: '1.5',
  version: 1,
  metadata: {
    timestamp: new Date().toISOString(),
    component: {
      type: 'application',
      name: '@closerai/desktop',
      version: desktopPkg.version,
      licenses: [{ license: { id: desktopPkg.license || 'MIT' } }],
    },
  },
  components,
}

const outIndex = process.argv.indexOf('--out')
const out = outIndex !== -1 ? process.argv[outIndex + 1] : join(root, 'sbom.json')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify(bom, null, 2) + '\n')
console.error('SBOM OK — ' + components.length + ' components written to ' + out)
