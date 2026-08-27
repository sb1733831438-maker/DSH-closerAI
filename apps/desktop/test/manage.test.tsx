import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Manage } from '../src/renderer/src/Manage'
import type { AppState, Capabilities, Diagnostics, McpServer, OpResult } from '../src/shared/types'

/**
 * Renderer component tests for the CloserAI management page (Manage.tsx).
 * jsdom environment (see vitest.config.ts environmentMatchGlobs).
 *
 * Regression guards:
 * - R-06: permission hint must render the mode label, not the literal
 *   "${MODE_LABEL[state.mode]}" text.
 * - R-07: the log viewer must render log line text, not "[object Object]".
 * - R-34: saving a NEW MCP server must call addMcpServer (not updateMcpServer).
 */

const CAPABILITIES: Capabilities = { webSearch: true, webFetch: false, skills: true }

const APP_STATE: AppState = {
  mode: 'chat',
  activeProjectId: null,
  projects: [],
  sessions: [],
  capabilities: CAPABILITIES,
  permissions: [
    {
      mode: 'chat',
      entries: [{ tool: '对话', permission: '只与模型对话，读取用户共享的附件' }],
    },
  ],
  launchAtLogin: false,
  backendUrl: null,
  dshMode: 'managed',
  systemSyncError: null,
}

const DIAGNOSTICS: Diagnostics = {
  appVersion: '0.8.0',
  platform: 'win32',
  mode: 'chat',
  activeProjectName: null,
  capabilities: CAPABILITIES,
  sessionCount: 0,
  backendUrl: null,
  supervisorState: 'idle',
  supervisorPid: null,
  logLines: [
    { stream: 'stdout', text: 'dsh web: http://127.0.0.1:55182', at: 1 },
    { stream: 'stderr', text: 'ready', at: 2 },
  ],
  generatedAt: Date.now(),
}

interface MockBridge {
  getAppState: ReturnType<typeof vi.fn>
  listMcpServers: ReturnType<typeof vi.fn>
  addMcpServer: ReturnType<typeof vi.fn>
  updateMcpServer: ReturnType<typeof vi.fn>
  retryBackend: ReturnType<typeof vi.fn>
  getDiagnostics: ReturnType<typeof vi.fn>
  exportDiagnostics: ReturnType<typeof vi.fn>
  setLaunchAtLogin: ReturnType<typeof vi.fn>
  setCapabilities: ReturnType<typeof vi.fn>
  openChat: ReturnType<typeof vi.fn>
  [key: string]: unknown
}

let bridge: MockBridge

beforeEach(() => {
  bridge = {
    getAppState: vi.fn().mockResolvedValue(APP_STATE),
    listMcpServers: vi.fn().mockResolvedValue([] as McpServer[]),
    addMcpServer: vi.fn().mockResolvedValue({ ok: true } as OpResult),
    updateMcpServer: vi.fn().mockResolvedValue({ ok: false, error: '未找到该 MCP 服务器' }),
    getDiagnostics: vi.fn().mockResolvedValue(DIAGNOSTICS),
    exportDiagnostics: vi.fn().mockResolvedValue({ ok: true, path: '/tmp/diag.txt' }),
    setLaunchAtLogin: vi.fn().mockResolvedValue({ ok: true }),
    setCapabilities: vi.fn().mockResolvedValue({ ok: true }),
    retryBackend: vi.fn().mockResolvedValue({ ok: true }),
    openChat: vi.fn().mockResolvedValue({ ok: true }),
  }
  // Expose the mocked bridge to the component.
  ;(window as { closerai?: unknown }).closerai = bridge
})

describe('Manage (renderer)', () => {
  it('R-06: renders the real mode label in the permission hint', async () => {
    render(<Manage />)
    await screen.findByText('CloserAI 工作区')
    const hint = await screen.findByText(
      '当前模式「对话」设计授予的能力；实际启用的工具还受「能力设置」影响。',
    )
    expect(hint).toBeInTheDocument()
    // The literal must not leak through.
    expect(screen.queryByText(/当前模式「\$\{MODE_LABEL/)).toBeNull()
  })

  it('R-34: saving a new MCP server calls addMcpServer, not updateMcpServer', async () => {
    render(<Manage />)
    await screen.findByText('CloserAI 工作区')
    await screen.findByText('MCP 服务器')

    fireEvent.click(screen.getByText('＋ 添加服务器'))
    fireEvent.change(screen.getByPlaceholderText('例如：openviking / filesystem'), {
      target: { value: 'test-server' },
    })
    fireEvent.change(screen.getByPlaceholderText('例如：npx / python / node'), {
      target: { value: 'node' },
    })
    fireEvent.change(screen.getByPlaceholderText('例如：-y @some/mcp-server'), {
      target: { value: '-y @some/server' },
    })

    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    expect(bridge.addMcpServer).toHaveBeenCalledTimes(1)
    expect(bridge.updateMcpServer).not.toHaveBeenCalled()
    const arg = bridge.addMcpServer.mock.calls[0]?.[0] as Record<string, unknown>
    expect(arg.name).toBe('test-server')
    expect(arg.transport).toBe('stdio')
    expect(arg.command).toBe('node')
    expect(arg.args).toEqual(['-y', '@some/server'])
  })

  it('R-07: log viewer renders log line text, not [object Object]', async () => {
    render(<Manage />)
    await screen.findByText('CloserAI 工作区')

    fireEvent.click(screen.getByText('刷新'))
    await screen.findByText(/显示最近日志 \(2 行\)/)

    fireEvent.click(screen.getByText(/显示最近日志/))
    const logview = document.querySelector('.logview')
    expect(logview).not.toBeNull()
    expect(logview?.textContent).toContain('dsh web: http://127.0.0.1:55182')
    expect(logview?.textContent).toContain('ready')
    expect(logview?.textContent).not.toContain('[object Object]')
  })

  it('UX: shows the system-sync recovery card and retries the backend', async () => {
    bridge.getAppState = vi.fn().mockResolvedValue({
      ...APP_STATE,
      dshMode: 'system-sync',
      systemSyncError:
        '检测到另一个 DSH 正在使用同一 DSH 目录（很可能是你的 web 端 DSH 正在运行）。请先关闭它，再重新打开 CloserAI。',
    })
    render(<Manage />)
    await screen.findByText('CloserAI 工作区')

    expect(screen.getByText('无法启动系统 DSH')).toBeInTheDocument()
    expect(screen.getByText(/请先关闭正在使用 ~\/.dsh 的 web 端 DSH/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '重试' }))
    expect(bridge.retryBackend).toHaveBeenCalledTimes(1)
  })
})
