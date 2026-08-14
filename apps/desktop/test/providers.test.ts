import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startMockServer, type MockServer } from '@closerai/mock-provider'
import {
  DEEPSEEK_DEFAULT,
  MOCK_DEFAULT,
  normalizeProviderProfile,
  testConnectivity,
  toDshSettings,
} from '../src/main/providers.js'

describe('normalizeProviderProfile', () => {
  it('accepts a valid OpenAI-compatible profile', () => {
    const profile = normalizeProviderProfile({
      id: 'local',
      kind: 'openai-compatible',
      baseUrl: 'https://example.com/v1/',
      models: [{ id: 'm1' }, { id: 'm2' }],
      defaultModel: 'm2',
    })
    expect(profile.baseUrl).toBe('https://example.com/v1')
    expect(profile.defaultModel).toBe('m2')
  })

  it('defaults name and defaultModel', () => {
    const profile = normalizeProviderProfile({
      id: 'x',
      kind: 'openai-compatible',
      baseUrl: 'https://example.com/v1',
      models: [{ id: 'm1' }],
    })
    expect(profile.name).toBe('x')
    expect(profile.defaultModel).toBe('m1')
  })

  it('rejects an invalid scheme', () => {
    expect(() =>
      normalizeProviderProfile({ id: 'x', kind: 'mock', baseUrl: 'ftp://x', models: [{ id: 'm' }] }),
    ).toThrow(/http/)
  })

  it('rejects a default model outside the list', () => {
    expect(() =>
      normalizeProviderProfile({
        id: 'x',
        kind: 'mock',
        baseUrl: 'https://x/v1',
        models: [{ id: 'm1' }],
        defaultModel: 'nope',
      }),
    ).toThrow(/default model/)
  })

  it('ships sane built-in defaults', () => {
    expect(DEEPSEEK_DEFAULT.baseUrl).toBe('https://api.deepseek.com/v1')
    expect(MOCK_DEFAULT.kind).toBe('mock')
  })
})

describe('toDshSettings', () => {
  it('maps the profile into the llm-deepseek section shape', () => {
    const settings = toDshSettings(DEEPSEEK_DEFAULT)
    expect(settings.baseURL).toBe('https://api.deepseek.com/v1')
    expect(settings.models).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'deepseek-v4-pro' })]),
    )
  })
})

describe('testConnectivity', () => {
  let server: MockServer

  beforeAll(async () => {
    server = await startMockServer()
  })

  afterAll(async () => {
    await server.close()
  })

  it('succeeds against a compatible endpoint', async () => {
    const result = await testConnectivity({
      baseUrl: `${server.url}/v1`,
      apiKey: 'test-key',
      model: 'mock-model',
      timeoutMs: 5000,
    })
    expect(result.ok).toBe(true)
    expect(result.status).toBe(200)
  })

  it('fails when the endpoint is unreachable', async () => {
    const result = await testConnectivity({
      baseUrl: 'http://127.0.0.1:1/v1',
      apiKey: 'test-key',
      model: 'mock-model',
      timeoutMs: 3000,
    })
    expect(result.ok).toBe(false)
    expect(result.error).toBeTruthy()
  })
})
