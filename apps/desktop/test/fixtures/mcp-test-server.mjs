// Minimal Model Context Protocol stdio server for DSH MCP-mount tests.
//
// Speaks the raw MCP stdio transport: newline-delimited JSON-RPC 2.0
// (initialize -> initialized notification -> tools/list -> tools/call).
// Exposes one tool `echo_message` and logs a marker line to stderr so tests
// can assert the server was actually spawned by DSH.
import { createInterface } from 'node:readline'

const serverName = 'test-server'
const marker = '[mcp-fixture] server ready'

// Announce readiness on stderr (DSH captures child stderr into its logs).
process.stderr.write(marker + '\n')

const TOOLS = [
  {
    name: 'echo_message',
    description: 'Echoes the given message back.',
    inputSchema: {
      type: 'object',
      properties: { message: { type: 'string' } },
      required: ['message'],
    },
  },
]

let initialized = false
const rl = createInterface({ input: process.stdin, crlfDelay: Infinity })

function send(payload) {
  process.stdout.write(JSON.stringify(payload) + '\n')
}

rl.on('line', (line) => {
  let req
  try {
    req = JSON.parse(line)
  } catch {
    return
  }
  if (req.method === 'initialize') {
    initialized = true
    send({
      jsonrpc: '2.0',
      id: req.id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'closerai-test-mcp', version: '0.0.1' },
      },
    })
    return
  }
  if (req.method === 'notifications/initialized') return
  if (req.method === 'tools/list') {
    send({ jsonrpc: '2.0', id: req.id, result: { tools: TOOLS } })
    return
  }
  if (req.method === 'tools/call') {
    const { name, arguments: args } = req.params ?? {}
    if (name === 'echo_message') {
      send({
        jsonrpc: '2.0',
        id: req.id,
        result: {
          content: [{ type: 'text', text: `echo: ${String(args?.message ?? '')}` }],
        },
      })
      return
    }
    send({ jsonrpc: '2.0', id: req.id, result: { content: [{ type: 'text', text: 'unknown tool' }] } })
    return
  }
  // Unknown method: respond with a parse error so DSH does not hang.
  send({
    jsonrpc: '2.0',
    id: req.id,
    error: { code: -32601, message: `method not found: ${req.method ?? ''}` },
  })
})

// Keep the process alive until stdin closes.
rl.on('close', () => {
  process.exit(0)
})
