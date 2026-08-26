import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import yaml from 'js-yaml'
import type { McpServer } from '../shared/types.js'

/**
 * Runtime mounting of enabled MCP servers into the running DSH (ROADMAP A-4 /
 * BENCHMARK L1), without forking DSH core.
 *
 * DSH composes its plugin tree from per-profile patches: the managed home
 * boots a `headless` profile whose `cordis.patch.yml` is the "your patch
 * layer" merged over the bundle stack. `@deepseek-ai/dsh-mcp-client` is a
 * cordis plugin (already resolvable inside the profile's node_modules) that
 * connects to an MCP server and registers its tools as
 * `mcp__<serverName>__<tool>` on `ctx.tools`. One plugin instance per server.
 *
 * Credential values never land in the patch file: every env/header value is
 * injected through the DSH child's environment as
 * `CLOSERAI_MCP_<SERVER>_<KEY>`, and the patch references it with
 * `!!js process.env.<VAR>` (the same pattern DSH's own bundles use for
 * secrets). System-sync mode never calls this module — the user's own home is
 * never written.
 */

const MCP_PLUGIN = '@deepseek-ai/dsh-mcp-client'
const MCP_ROW_PREFIX = 'mcp-'
const MCP_ENV_PREFIX = 'CLOSERAI_MCP_'

/** Sentinel for a `!!js process.env.X` YAML scalar (emitted as the global tag). */
class JsExpr {
  readonly expr: string

  constructor(expr: string) {
    this.expr = expr
  }
}

const JsType = new yaml.Type('tag:yaml.org,2002:js', {
  kind: 'scalar',
  instanceOf: JsExpr,
  construct: (data) => new JsExpr(String(data)),
  represent: (value) => (value as JsExpr).expr,
})
const JS_SCHEMA = yaml.DEFAULT_SCHEMA.extend([JsType])

export interface McpPluginRow {
  id: string
  name: string
  config: Record<string, unknown>
}

interface PatchOp {
  id?: unknown
  insert?: unknown
  [key: string]: unknown
}

/** The profile DSH boots for `dsh web` in a CloserAI-managed home. */
export function managedProfileDir(home: string): string {
  return join(home, 'profiles', 'headless')
}

export function mcpPatchPath(home: string): string {
  return join(managedProfileDir(home), 'cordis.patch.yml')
}

function sanitizeServerName(name: string): string {
  const clean = name
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
  return clean.length > 0 ? clean : 'server'
}

/** Unique, YAML-safe, deterministic env var name for one credential value. */
export function mcpEnvVarName(serverName: string, key: string): string {
  const server = serverName.replace(/[^A-Za-z0-9_]/g, '_').toUpperCase()
  const field = key.replace(/[^A-Za-z0-9_]/g, '_').toUpperCase()
  return MCP_ENV_PREFIX + server + '_' + field
}

function uniqueServerName(base: string, used: Set<string>): string {
  if (!used.has(base)) return base
  let index = 2
  let candidate = `${base}-${index}`
  while (used.has(candidate)) {
    index += 1
    candidate = `${base}-${index}`
  }
  return candidate
}

function secretRecord(
  record: Record<string, string> | undefined,
  serverName: string,
  inject: Record<string, string>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (record === undefined) return out
  for (const [key, value] of Object.entries(record)) {
    if (value.length === 0) continue
    const varName = mcpEnvVarName(serverName, key)
    inject[varName] = value
    out[key] = new JsExpr(`process.env.${varName}`)
  }
  return out
}

/** Build the plugin row for one server; secret values go through `inject`. */
export function toMcpPluginRow(
  server: McpServer,
  serverName: string,
  inject: Record<string, string>,
): McpPluginRow {
  const config: Record<string, unknown> = { serverName }
  if (server.transport === 'http') {
    config.transport = 'streamable-http'
    if (server.url !== undefined && server.url.length > 0) config.url = server.url
    const headers = secretRecord(server.headers, serverName, inject)
    if (Object.keys(headers).length > 0) config.headers = headers
  } else {
    config.transport = 'stdio'
    if (server.command !== undefined && server.command.length > 0) config.command = server.command
    if (server.args !== undefined && server.args.length > 0) config.args = server.args
    const env = secretRecord(server.env, serverName, inject)
    if (Object.keys(env).length > 0) config.env = env
  }
  return { id: MCP_ROW_PREFIX + serverName, name: MCP_PLUGIN, config }
}

function isOurMcpRow(row: unknown): boolean {
  if (typeof row !== 'object' || row === null) return false
  const op = row as PatchOp
  return typeof op.id === 'string' && op.id.startsWith(MCP_ROW_PREFIX) && op.name === MCP_PLUGIN
}

/** Strip our MCP rows from an op; null when the op becomes empty. */
function stripOurRows(op: PatchOp): PatchOp | null {
  if (op.insert === undefined || !Array.isArray(op.insert)) return op
  const kept = op.insert.filter((row) => !isOurMcpRow(row))
  if (kept.length === 0) return null
  return { ...op, insert: kept }
}

/**
 * Read the profile patch as a list of patch ops. Returns `null` when the file
 * cannot be parsed — the caller must not rewrite it (never clobber a patch we
 * cannot understand).
 */
export function readPatch(settingsPath: string): PatchOp[] | null {
  let raw: string
  try {
    raw = readFileSync(settingsPath, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    return null
  }
  try {
    const parsed: unknown = yaml.load(raw, { schema: JS_SCHEMA })
    if (Array.isArray(parsed)) return parsed as PatchOp[]
    return []
  } catch {
    return null
  }
}

/**
 * Synchronize the enabled MCP servers into the headless profile's
 * `cordis.patch.yml`, preserving every other patch op. Disabled/removed
 * servers drop their rows. Returns the map of env vars that must be passed to
 * the DSH child so the `!!js process.env.*` references resolve.
 *
 * Returns `null` when the existing patch is unreadable (no write happens).
 */
export function writeDshMcpPlugins(
  home: string,
  servers: McpServer[],
): Record<string, string> | null {
  const patchPath = mcpPatchPath(home)
  const existing = readPatch(patchPath)
  if (existing === null) return null
  const kept = existing.map((op) => stripOurRows(op)).filter((op): op is PatchOp => op !== null)

  const inject: Record<string, string> = {}
  const used = new Set<string>()
  const rows = servers
    .filter((server) => server.enabled)
    .map((server) => {
      const serverName = uniqueServerName(sanitizeServerName(server.name), used)
      used.add(serverName)
      return toMcpPluginRow(server, serverName, inject)
    })

  const next: PatchOp[] = rows.length === 0 ? kept : [...kept, { insert: rows }]
  mkdirSync(dirname(patchPath), { recursive: true })
  writeFileSync(patchPath, yaml.dump(next, { schema: JS_SCHEMA, lineWidth: 120 }), 'utf8')
  return inject
}
