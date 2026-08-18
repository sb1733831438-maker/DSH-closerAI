import { describe, expect, it } from 'vitest'
import {
  buildDiagnostics,
  renderDiagnosticsReport,
  sanitizeLogLine,
} from '../src/main/diagnostics.js'
import type { DiagnosticsInput } from '../src/main/diagnostics.js'

const BASE_INPUT: DiagnosticsInput = {
  appVersion: '0.0.6',
  platform: 'win32',
  mode: 'code',
  activeProjectName: 'my-app',
  capabilities: { webSearch: true, webFetch: false, skills: true },
  sessionCount: 3,
  backendUrl: 'http://127.0.0.1:1234',
  supervisorState: 'ready',
  supervisorPid: 42,
  logLines: [{ stream: 'stdout', text: 'ready on http://127.0.0.1:1234', at: 1 }],
  generatedAt: 1,
}

describe('sanitizeLogLine', () => {
  it('redacts sk- API keys', () => {
    const out = sanitizeLogLine('key=sk-1234567890abcdefghijklmnop used')
    expect(out).not.toContain('sk-1234567890')
    expect(out).toContain('***')
  })

  it('redacts bearer tokens and auth headers', () => {
    expect(sanitizeLogLine('Authorization: Bearer abc.def.ghi')).toBe('Authorization: Bearer ***')
    expect(sanitizeLogLine('x-api-key: supersecretvalue')).toBe('x-api-key: ***')
  })

  it('redacts key=value secrets', () => {
    expect(sanitizeLogLine('api_key=abc123')).toBe('api_key=***')
    expect(sanitizeLogLine('password=hunter2')).toBe('password=***')
    expect(sanitizeLogLine('DEEPSEEK_API_KEY=sk-leakme')).toBe('DEEPSEEK_API_KEY=***')
  })

  it('leaves ordinary log text untouched', () => {
    const plain = 'DSH listening on 127.0.0.1:1234'
    expect(sanitizeLogLine(plain)).toBe(plain)
  })
})

describe('buildDiagnostics', () => {
  it('redacts every log line before returning', () => {
    const input: DiagnosticsInput = {
      ...BASE_INPUT,
      logLines: [
        { stream: 'stdout', text: 'launching with key=sk-super-secret-token-here', at: 1 },
        { stream: 'stderr', text: 'plain error line', at: 2 },
      ],
    }
    const diag = buildDiagnostics(input)
    expect(diag.logLines[0]!.text).not.toContain('sk-super-secret')
    expect(diag.logLines[1]!.text).toBe('plain error line')
  })
})

describe('renderDiagnosticsReport', () => {
  it('includes the summary and sanitized logs', () => {
    const diag = buildDiagnostics(BASE_INPUT)
    const report = renderDiagnosticsReport(diag)
    expect(report).toContain('CloserAI 诊断报告')
    expect(report).toContain('当前模式: code')
    expect(report).toContain('后端地址: http://127.0.0.1:1234')
    expect(report).toContain('ready on http://127.0.0.1:1234')
  })
})
