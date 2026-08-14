import { describe, expect, it } from 'vitest'
import {
  createMockCompletions,
  fnv1a,
  type MockChatCompletionsRequest,
} from '../src/completions.js'

const request: MockChatCompletionsRequest = {
  model: 'mock-model',
  messages: [
    { role: 'system', content: 'You are a mock.' },
    { role: 'user', content: 'Hello world' },
  ],
  seed: 42,
}

describe('fnv1a', () => {
  it('is stable for the same input', () => {
    expect(fnv1a('abc')).toBe(fnv1a('abc'))
  })

  it('differs for different inputs', () => {
    expect(fnv1a('abc')).not.toBe(fnv1a('abd'))
  })

  it('returns an unsigned 32-bit integer', () => {
    const value = fnv1a('hello')
    expect(Number.isInteger(value)).toBe(true)
    expect(value).toBeGreaterThanOrEqual(0)
    expect(value).toBeLessThanOrEqual(0xffffffff)
  })
})

describe('createMockCompletions', () => {
  const completions = createMockCompletions({ now: () => 1_700_000_000 })

  it('produces an OpenAI-compatible response shape', () => {
    const response = completions(request)
    expect(response.object).toBe('chat.completion')
    expect(response.id).toMatch(/^chatcmpl-[0-9a-f]{8}$/)
    expect(response.model).toBe('mock-model')
    expect(response.choices).toHaveLength(1)
    expect(response.choices[0]!.message.role).toBe('assistant')
    expect(response.choices[0]!.finish_reason).toBe('stop')
    expect(response.created).toBe(1_700_000_000)
    expect(response.usage.total_tokens).toBe(
      response.usage.prompt_tokens + response.usage.completion_tokens,
    )
  })

  it('is deterministic for identical input', () => {
    const a = completions(request)
    const b = completions({ ...request })
    expect(a).toEqual(b)
  })

  it('varies with the seed', () => {
    const a = completions(request)
    const b = completions({ ...request, seed: 43 })
    expect(a.id).not.toBe(b.id)
  })

  it('varies with the conversation content', () => {
    const a = completions(request)
    const b = completions({
      ...request,
      messages: [...request.messages, { role: 'user', content: 'more' }],
    })
    expect(a.id).not.toBe(b.id)
  })

  it('echoes the last user message in the reply', () => {
    const response = completions(request)
    expect(response.choices[0]!.message.content).toContain('Hello world')
  })

  it('falls back to the default model', () => {
    const response = completions({ messages: [{ role: 'user', content: 'hi' }] })
    expect(response.model).toBe('mock-model')
  })

  it('respects a custom prefix and default model', () => {
    const custom = createMockCompletions({ prefix: 'test:', defaultModel: 'other' })
    const response = custom({ messages: [{ role: 'user', content: 'hi' }] })
    expect(response.model).toBe('other')
    expect(response.choices[0]!.message.content.startsWith('test:')).toBe(true)
  })
})
