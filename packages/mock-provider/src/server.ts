import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import {
  createMockCompletions,
  type MockChatCompletionsRequest,
  type MockCompletionsOptions,
} from './completions.js'

export interface MockServer {
  port: number
  url: string
  close: () => Promise<void>
}

export interface MockServerOptions extends MockCompletionsOptions {
  /** Port to bind; 0 selects a random free loopback port. */
  port?: number
  /** Loopback host. */
  host?: string
}

function writeJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'access-control-allow-origin': '*',
  })
  res.end(payload)
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > 4 * 1024 * 1024) {
        reject(new Error('request body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    })
    req.on('error', reject)
  })
}

export function startMockServer(options: MockServerOptions = {}): Promise<MockServer> {
  const completions = createMockCompletions(options)
  const model = options.defaultModel ?? 'mock-model'

  const server = createServer((req, res) => {
    const method = req.method ?? 'GET'
    const url = new URL(req.url ?? '/', 'http://localhost')

    if (method === 'GET' && url.pathname === '/health') {
      writeJson(res, 200, { ok: true })
      return
    }

    if (method === 'GET' && url.pathname === '/v1/models') {
      writeJson(res, 200, {
        object: 'list',
        data: [
          {
            id: model,
            object: 'model',
            created: Math.floor(Date.now() / 1000),
            owned_by: 'closerai-mock',
          },
        ],
      })
      return
    }

    if (method === 'POST' && url.pathname === '/v1/chat/completions') {
      void readJsonBody(req)
        .then((body) => {
          const request = body as MockChatCompletionsRequest
          if (!Array.isArray(request.messages)) {
            writeJson(res, 400, { error: { message: 'messages must be an array' } })
            return
          }
          const response = completions(request)

          if (request.stream === true) {
            res.writeHead(200, {
              'content-type': 'text/event-stream; charset=utf-8',
              'cache-control': 'no-cache',
              connection: 'keep-alive',
              'access-control-allow-origin': '*',
            })
            const chunk = {
              id: response.id,
              object: 'chat.completion.chunk',
              created: response.created,
              model: response.model,
              choices: [
                {
                  index: 0,
                  delta: { role: 'assistant', content: response.choices[0]!.message.content },
                  finish_reason: null,
                },
              ],
            }
            res.write(`data: ${JSON.stringify(chunk)}\n\n`)
            res.write('data: [DONE]\n\n')
            res.end()
            return
          }

          writeJson(res, 200, response)
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error)
          writeJson(res, 400, { error: { message } })
        })
      return
    }

    writeJson(res, 404, { error: { message: `not found: ${method} ${url.pathname}` } })
  })

  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(options.port ?? 0, options.host ?? '127.0.0.1', () => {
      const address = server.address() as AddressInfo
      const close = (): Promise<void> =>
        new Promise((done) => {
          // Bounded shutdown: force-close lingering keep-alive connections so
          // `server.close()` never hangs (a killed DSH child can leave a
          // half-open socket that blocks the callback).
          server.closeAllConnections?.()
          server.close(() => done())
          const timer = setTimeout(() => done(), 2000)
          timer.unref?.()
        })
      resolve({ port: address.port, url: `http://127.0.0.1:${address.port}`, close })
    })
  })
}
