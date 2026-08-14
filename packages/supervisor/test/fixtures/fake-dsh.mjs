// Minimal fake of `dsh web` for supervisor tests.
// argv: [node, script, 'web', '--host', host, '--port', port]
// Env switches:
//   FAKE_DSH_CRASH_AFTER_MS          exit after N ms (simulates a crash)
//   FAKE_DSH_EXIT_CODE                exit code to use for the crash (default 1)
//   FAKE_DSH_CLOSE_SERVER_AFTER_MS    stop serving (but stay alive) after N ms
//   FAKE_DSH_NO_READY=1               never print the ready line
import { createServer } from 'node:http'

const args = process.argv.slice(2)
const hostIdx = args.indexOf('--host')
const portIdx = args.indexOf('--port')
const host = hostIdx >= 0 ? args[hostIdx + 1] : '127.0.0.1'
const port = portIdx >= 0 ? Number(args[portIdx + 1]) : 0

const server = createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
  res.end('fake-dsh')
})

const crashAfterMs = Number(process.env.FAKE_DSH_CRASH_AFTER_MS ?? 0)
const closeAfterMs = Number(process.env.FAKE_DSH_CLOSE_SERVER_AFTER_MS ?? 0)
const noReady = process.env.FAKE_DSH_NO_READY === '1'

server.listen(port, host, () => {
  const address = server.address()
  const actual = typeof address === 'object' && address !== null ? address.port : port
  if (!noReady) {
    console.log(`dsh web: http://${host}:${actual}`)
  }
  if (crashAfterMs > 0) {
    setTimeout(() => process.exit(Number(process.env.FAKE_DSH_EXIT_CODE ?? 1)), crashAfterMs)
  }
  if (closeAfterMs > 0) {
    setTimeout(() => {
      server.close()
      // Keep the process alive after closing the port so the supervisor must
      // detect unhealthiness via its health probe rather than seeing an exit.
      setInterval(() => {}, 1 << 30)
    }, closeAfterMs)
  }
})
