export interface MockMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content?: string | null
}

export interface MockChatCompletionsRequest {
  model?: string
  messages: MockMessage[]
  seed?: number | null
  temperature?: number | null
  max_tokens?: number | null
  stream?: boolean
  [key: string]: unknown
}

export interface MockChoice {
  index: number
  message: { role: 'assistant'; content: string }
  finish_reason: 'stop'
}

export interface MockUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

export interface MockChatCompletionsResponse {
  id: string
  object: 'chat.completion'
  created: number
  model: string
  choices: MockChoice[]
  usage: MockUsage
}

export interface MockCompletionsOptions {
  /** Prefix for the generated text. Defaults to "mock:". */
  prefix?: string
  /** Model returned when the request omits one. Defaults to "mock-model". */
  defaultModel?: string
  /** Clock for the `created` field; injectable for deterministic tests. */
  now?: () => number
}

export interface MockCompletions {
  (request: MockChatCompletionsRequest): MockChatCompletionsResponse
}

const DEFAULT_MODEL = 'mock-model'

/** FNV-1a 32-bit hash — small, stable, dependency-free. */
export function fnv1a(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

function hex32(value: number): string {
  return value.toString(16).padStart(8, '0')
}

/** Canonical, order-stable serialization of a completions request. */
function canonicalKey(request: MockChatCompletionsRequest): string {
  const messages = request.messages.map((m) => `${m.role}:${m.content ?? ''}`).join('|')
  const seed = request.seed === undefined || request.seed === null ? 'none' : String(request.seed)
  return `${seed}\n${request.model ?? ''}\n${messages}`
}

function countTokens(text: string): number {
  // Rough, deterministic token estimate: whitespace-delimited words, min 1.
  const words = text.trim().split(/\s+/).filter(Boolean)
  return Math.max(1, words.length)
}

export function createMockCompletions(options: MockCompletionsOptions = {}): MockCompletions {
  const prefix = options.prefix ?? 'mock:'
  const defaultModel = options.defaultModel ?? DEFAULT_MODEL
  const now = options.now ?? (() => Math.floor(Date.now() / 1000))

  return (request) => {
    const model = request.model ?? defaultModel
    const key = canonicalKey(request)
    const digest = hex32(fnv1a(key))

    const lastUser = [...request.messages].reverse().find((m) => m.role === 'user')
    const lastUserText = (lastUser?.content ?? '').trim()

    const seedLabel =
      request.seed === undefined || request.seed === null ? 'none' : String(request.seed)
    const excerpt = lastUserText.length > 0 ? ` "${lastUserText}"` : ''
    const content =
      `${prefix} deterministic reply to${excerpt}` +
      ` [model=${model}, seed=${seedLabel}, turns=${request.messages.length}]`

    const completionTokens = countTokens(content)
    const promptTokens = request.messages.reduce((sum, m) => sum + countTokens(m.content ?? ''), 0)

    return {
      id: `chatcmpl-${digest}`,
      object: 'chat.completion',
      created: now(),
      model,
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: Math.max(1, promptTokens),
        completion_tokens: completionTokens,
        total_tokens: Math.max(1, promptTokens) + completionTokens,
      },
    }
  }
}
