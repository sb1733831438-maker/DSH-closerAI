import type { Capabilities, DiagnosticLogLine, Diagnostics, Mode } from '../shared/types.js'

const REDACTIONS: { re: RegExp; replacement: string }[] = [
  // whole sk- API keys -> keep a recognizable prefix
  { re: /\bsk-[A-Za-z0-9_-]{8,}\b/g, replacement: 'sk-***' },
  // Authorization: Bearer <token>
  { re: /(Authorization\s*:\s*Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, replacement: '$1***' },
  // key=value / key: value secret fields
  {
    re: /((?:api[-_]?key|password|secret|token|apikey)\s*[:=]\s*)[^\s,;]+/gi,
    replacement: '$1***',
  },
  // env echoes
  { re: /(DEEPSEEK_API_KEY\s*=\s*)[^\s,;]+/g, replacement: '$1***' },
]

export function sanitizeLogLine(text: string): string {
  let out = text
  for (const { re, replacement } of REDACTIONS) {
    out = out.replace(re, replacement)
  }
  return out
}
export interface DiagnosticsInput {
  appVersion: string
  platform: string
  mode: Mode
  activeProjectName: string | null
  capabilities: Capabilities
  sessionCount: number
  backendUrl: string | null
  supervisorState: string
  supervisorPid: number | null
  logLines: DiagnosticLogLine[]
  generatedAt: number
}

export function buildDiagnostics(input: DiagnosticsInput): Diagnostics {
  return {
    appVersion: input.appVersion,
    platform: input.platform,
    mode: input.mode,
    activeProjectName: input.activeProjectName,
    capabilities: { ...input.capabilities },
    sessionCount: input.sessionCount,
    backendUrl: input.backendUrl,
    supervisorState: input.supervisorState,
    supervisorPid: input.supervisorPid,
    logLines: input.logLines.map((line) => ({
      stream: line.stream,
      text: sanitizeLogLine(line.text),
      at: line.at,
    })),
    generatedAt: input.generatedAt,
  }
}

/** Render a diagnostics snapshot as a plain-text report for export. */
export function renderDiagnosticsReport(diag: Diagnostics): string {
  const lines: string[] = []
  lines.push('CloserAI 诊断报告')
  lines.push('='.repeat(40))
  lines.push('生成时间: ' + new Date(diag.generatedAt).toLocaleString('zh-CN'))
  lines.push('应用版本: ' + diag.appVersion)
  lines.push('平台: ' + diag.platform)
  lines.push('当前模式: ' + diag.mode)
  lines.push('当前项目: ' + (diag.activeProjectName ?? '（无）'))
  lines.push(
    '能力: ' +
      '联网=' +
      (diag.capabilities.webSearch ? '开' : '关') +
      ' fetch=' +
      (diag.capabilities.webFetch ? '开' : '关') +
      ' skills=' +
      (diag.capabilities.skills ? '开' : '关'),
  )
  lines.push('会话数量: ' + diag.sessionCount)
  lines.push('后端地址: ' + (diag.backendUrl ?? '（未运行）'))
  lines.push('DSH 状态: ' + diag.supervisorState + ' (pid=' + (diag.supervisorPid ?? 'n/a') + ')')
  lines.push('')
  lines.push('-- 最近日志（已脱敏） --')
  for (const line of diag.logLines) {
    lines.push('[' + new Date(line.at).toISOString() + '] [' + line.stream + '] ' + line.text)
  }
  return lines.join('\n') + '\n'
}
