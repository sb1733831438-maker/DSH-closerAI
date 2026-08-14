import { startMockServer } from './server.js'

const argPort = process.argv[2]
const port = Number(process.env.PORT ?? (argPort && argPort !== '' ? argPort : 0))

if (Number.isNaN(port) || port < 0 || port > 65535) {
  console.error(`invalid port: ${process.env.PORT ?? argPort}`)
  process.exit(2)
}

const server = await startMockServer({ port })
console.log(`closerai mock-provider listening on ${server.url}`)
console.log(`health: ${server.url}/health`)

const shutdown = (): void => {
  void server.close().then(() => {
    console.log('closerai mock-provider stopped')
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
