import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startMockServer, type MockServer } from '../src/server.js'

let server: MockServer

beforeAll(async () => {
  server = await startMockServer({ now: () => 1_700_000_000 })
})

afterAll(async () => {
  await server.close()
})

describe('mock server', () => {
  it('binds a loopback port and reports health', async () => {
    expect(server.port).toBeGreaterThan(0)
    expect(server.url).toContain('127.0.0.1')
    const res = await fetch(`${server.url}/health`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('lists models', async () => {
    const res = await fetch(`${server.url}/v1/models`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { object: string; data: { id: string }[] }
    expect(body.object).toBe('list')
    expect(body.data[0]!.id).toBe('mock-model')
  })

  it('returns deterministic non-streaming completions', async () => {
    const payload = {
      model: 'mock-model',
      messages: [{ role: 'user' as const, content: 'ping' }],
      seed: 7,
    }
    const first = await (
      await fetch(`${server.url}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
    ).json()
    const second = await (
      await fetch(`${server.url}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
    ).json()
    expect(first).toEqual(second)
    expect((first as { choices: { message: { role: string } }[] }).choices[0]!.message.role).toBe(
      'assistant',
    )
  })

  it('rejects a malformed body with 400', async () => {
    const res = await fetch(`${server.url}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not json',
    })
    expect(res.status).toBe(400)
  })

  it('rejects a missing messages array with 400', async () => {
    const res = await fetch(`${server.url}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'mock-model' }),
    })
    expect(res.status).toBe(400)
  })

  it('streams SSE chunks when stream=true', async () => {
    const res = await fetch(`${server.url}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'mock-model',
        stream: true,
        messages: [{ role: 'user', content: 'stream me' }],
      }),
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')
    const text = await res.text()
    expect(text).toContain('data: [DONE]')
    expect(text).toContain('"object":"chat.completion.chunk"')
  })

  it('returns 404 for unknown routes', async () => {
    const res = await fetch(`${server.url}/nope`)
    expect(res.status).toBe(404)
  })
})
