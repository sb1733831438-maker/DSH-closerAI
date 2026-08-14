export type ProviderKind = 'deepseek' | 'openai-compatible' | 'mock'

export interface ModelEntry {
  id: string
  name?: string
  contextWindow?: number
}

export interface ProviderProfile {
  /** Stable local id; the API key is stored separately in the OS keychain. */
  id: string
  kind: ProviderKind
  /** Display name, e.g. "DeepSeek" or "My local gateway". */
  name: string
  /** Full endpoint prefix including /v1, e.g. https://api.deepseek.com/v1. */
  baseUrl: string
  defaultModel: string
  models: ModelEntry[]
}

export interface ProviderStore {
  activeProviderId: string | null
  providers: ProviderProfile[]
}

export const DEEPSEEK_DEFAULT: ProviderProfile = Object.freeze({
  id: 'deepseek-official',
  kind: 'deepseek',
  name: 'DeepSeek',
  baseUrl: 'https://api.deepseek.com/v1',
  defaultModel: 'deepseek-v4-pro',
  models: [
    { id: 'deepseek-v4-flash', name: 'DeepSeek-V4-Flash', contextWindow: 1_000_000 },
    { id: 'deepseek-v4-pro', name: 'DeepSeek-V4-Pro', contextWindow: 1_000_000 },
  ],
})

export const MOCK_DEFAULT: ProviderProfile = Object.freeze({
  id: 'mock',
  kind: 'mock',
  name: 'Mock (offline)',
  baseUrl: 'http://127.0.0.1:0/v1',
  defaultModel: 'mock-model',
  models: [{ id: 'mock-model', name: 'Mock model', contextWindow: 128_000 }],
})

export interface ConnectivityResult {
  ok: boolean
  status?: number
  error?: string
}

function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '')
  if (trimmed.length === 0) throw new Error('base URL must not be empty')
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new Error(`invalid base URL: ${raw}`)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('base URL must use http or https')
  }
  return trimmed
}

/** Validate a provider profile; returns a normalized copy or throws. */
export function normalizeProviderProfile(input: unknown): ProviderProfile {
  const raw = input as Partial<ProviderProfile>
  if (raw.id === undefined || raw.id.length === 0) throw new Error('provider id is required')
  if (raw.kind !== 'deepseek' && raw.kind !== 'openai-compatible' && raw.kind !== 'mock') {
    throw new Error(`unknown provider kind: ${String(raw.kind)}`)
  }
  const baseUrl = normalizeBaseUrl(raw.baseUrl ?? '')
  const models = (raw.models ?? []).map((model) => {
    if (model.id.length === 0) throw new Error('model ids must be non-empty')
    return {
      id: model.id,
      ...(model.name === undefined ? {} : { name: model.name }),
      ...(model.contextWindow === undefined ? {} : { contextWindow: model.contextWindow }),
    }
  })
  if (models.length === 0) throw new Error('at least one model is required')
  const defaultModel = raw.defaultModel ?? models[0]!.id
  if (!models.some((model) => model.id === defaultModel)) {
    throw new Error(`default model "${defaultModel}" is not in the model list`)
  }
  return { id: raw.id, kind: raw.kind, name: raw.name ?? raw.id, baseUrl, defaultModel, models }
}

/** The settings.yaml section DSH's llm-deepseek plugin reads. */
export function toDshSettings(profile: ProviderProfile): Record<string, unknown> {
  return {
    baseURL: profile.baseUrl,
    thinking: 'enabled',
    reasoningEffort: 'high',
    models: profile.models.map((model) => ({
      id: model.id,
      ...(model.name === undefined ? {} : { name: model.name }),
      ...(model.contextWindow === undefined ? {} : { contextWindow: model.contextWindow }),
    })),
  }
}

export interface ConnectivityOptions {
  baseUrl: string
  apiKey: string
  model: string
  timeoutMs?: number
}

/**
 * Probe an OpenAI-compatible chat-completions endpoint with a minimal
 * streaming request. Resolves ok=true only when the endpoint answers.
 */
export async function testConnectivity(options: ConnectivityOptions): Promise<ConnectivityResult> {
  const timeoutMs = options.timeoutMs ?? 15_000
  try {
    const response = await fetch(`${options.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${options.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
        stream: false,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (response.ok) return { ok: true, status: response.status }
    let detail = ''
    try {
      const body = (await response.json()) as { error?: { message?: string } }
      detail = String(body.error?.message ?? '')
    } catch {
      // non-JSON error body; keep the empty detail
    }
    return { ok: false, status: response.status, error: detail || `HTTP ${response.status}` }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('timeout') || message.includes('aborted')) {
      return { ok: false, error: `timed out after ${timeoutMs}ms` }
    }
    return { ok: false, error: message }
  }
}
