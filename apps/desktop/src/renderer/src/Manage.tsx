import { useEffect, useState } from 'react'
import type {
  AppState,
  Capabilities,
  Diagnostics,
  McpServer,
  McpTransport,
  Mode,
  OpResult,
  Project,
  SessionEntry,
} from '../../shared/types'

const MODE_LABEL: Record<Mode, string> = {
  chat: '对话',
  work: '工作',
  code: '代码',
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleString('zh-CN')
}

function shortId(id: string): string {
  return id.length > 24 ? id.slice(0, 24) + '…' : id
}

function errText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function parseKeyValue(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of text.split(/[\r\n]+/)) {
    const trimmed = line.trim()
    if (trimmed === '') continue
    const eq = trimmed.indexOf('=')
    const key = (eq >= 0 ? trimmed.slice(0, eq) : trimmed).trim()
    const value = (eq >= 0 ? trimmed.slice(eq + 1) : '').trim()
    if (key !== '') out[key] = value
  }
  return out
}

function parseArgs(text: string): string[] {
  return text
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

export function Manage(): React.JSX.Element {
  const [state, setState] = useState<AppState | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [caps, setCaps] = useState<Capabilities | null>(null)
  const [diag, setDiag] = useState<Diagnostics | null>(null)
  const [showLogs, setShowLogs] = useState(false)
  const [name, setName] = useState('')
  const [mode, setMode] = useState<Mode>('chat')
  const [workspaceDir, setWorkspaceDir] = useState('')

  const [updateInfo, setUpdateInfo] = useState('')
  const [mcpServers, setMcpServers] = useState<McpServer[] | null>(null)
  const [mcpName, setMcpName] = useState('')
  const [mcpTransport, setMcpTransport] = useState<McpTransport>('stdio')
  const [mcpDesc, setMcpDesc] = useState('')
  const [mcpCommand, setMcpCommand] = useState('')
  const [mcpArgs, setMcpArgs] = useState('')
  const [mcpEnv, setMcpEnv] = useState('')
  const [mcpUrl, setMcpUrl] = useState('')
  const [mcpHeaders, setMcpHeaders] = useState('')
  const [mcpEditId, setMcpEditId] = useState<string | null>(null)

  const onCheckUpdate = async (): Promise<void> => {
    setUpdateInfo('正在检查更新…')
    try {
      const status = await window.closerai.checkForUpdates()
      setUpdateInfo(
        status.state === 'disabled'
          ? '当前为开发/便携版，不支持自动更新'
          : status.state === 'checking'
            ? '正在检查更新…'
            : status.state === 'up-to-date'
              ? '已是最新版本'
              : status.state === 'available'
                ? '发现新版本 ' + status.version + '，可在诊断页安装'
                : status.state === 'downloading'
                  ? '正在下载更新… ' + Math.round(status.percent) + '%'
                  : status.state === 'downloaded'
                    ? '更新 ' + status.version + ' 已就绪，重启后生效'
                    : '更新检查失败：' + status.message,
      )
    } catch (e) {
      setUpdateInfo(errText(e))
    }
  }
  const loadMcp = async (): Promise<void> => {
    try {
      setMcpServers(await window.closerai.listMcpServers())
    } catch (e) {
      setError(errText(e))
    }
  }

  const resetMcpForm = (): void => {
    setMcpEditId(null)
    setMcpName('')
    setMcpTransport('stdio')
    setMcpDesc('')
    setMcpCommand('')
    setMcpArgs('')
    setMcpEnv('')
    setMcpUrl('')
    setMcpHeaders('')
  }

  const startEditMcp = (server: McpServer): void => {
    setMcpEditId(server.id)
    setMcpName(server.name)
    setMcpTransport(server.transport)
    setMcpDesc(server.description ?? '')
    setMcpCommand(server.command ?? '')
    setMcpArgs((server.args ?? []).join(' '))
    setMcpEnv(
      Object.entries(server.env ?? {})
        .map(([k, v]) => k + '=' + v)
        .join('\n'),
    )
    setMcpUrl(server.url ?? '')
    setMcpHeaders(
      Object.entries(server.headers ?? {})
        .map(([k, v]) => k + '=' + v)
        .join('\n'),
    )
  }

  const onSaveMcp = async (): Promise<void> => {
    setBusy(true)
    try {
      const input = {
        name: mcpName,
        transport: mcpTransport,
        description: mcpDesc,
        command: mcpCommand,
        args: parseArgs(mcpArgs),
        env: parseKeyValue(mcpEnv),
        url: mcpUrl,
        headers: parseKeyValue(mcpHeaders),
      }
      const result =
        mcpEditId === null || mcpEditId === ''
          ? await window.closerai.addMcpServer(input)
          : await window.closerai.updateMcpServer({ id: mcpEditId, ...input })
      flash(result)
      if (result.ok) {
        resetMcpForm()
        await loadMcp()
      }
    } catch (e) {
      setError(errText(e))
    } finally {
      setBusy(false)
    }
  }

  const onRemoveMcp = async (id: string): Promise<void> => {
    setBusy(true)
    try {
      flash(await window.closerai.removeMcpServer(id))
      if (mcpEditId === id) resetMcpForm()
      await loadMcp()
    } finally {
      setBusy(false)
    }
  }

  const onToggleMcp = async (server: McpServer): Promise<void> => {
    try {
      await window.closerai.setMcpServerEnabled(server.id, !server.enabled)
      await loadMcp()
    } catch (e) {
      setError(errText(e))
    }
  }

  const onExportMcp = async (): Promise<void> => {
    setBusy(true)
    try {
      const dir = await window.closerai.pickDirectory()
      if (dir === null) return
      const result = await window.closerai.exportMcpConfig(dir)
      flash(result)
      if (result.ok) setNotice('已导出 mcp.json：' + (result as { path?: string }).path)
    } catch (e) {
      setError(errText(e))
    } finally {
      setBusy(false)
    }
  }

  const refresh = async (): Promise<void> => {
    const next = await window.closerai.getAppState()
    setState(next)
    setCaps((previous) => previous ?? { ...next.capabilities })
  }

  useEffect(() => {
    void refresh().catch((e) => setError(errText(e)))
    void loadMcp().catch((e) => setError(errText(e)))
  }, [])

  const flash = (result: OpResult): void => {
    if (result.ok) {
      setNotice('完成')
      setError('')
    } else {
      setNotice('')
      setError(result.error ?? '操作失败')
    }
  }

  const onCreateProject = async (): Promise<void> => {
    setBusy(true)
    try {
      const result = await window.closerai.createProject({
        name,
        mode,
        workspaceDir: mode === 'code' && workspaceDir.trim() !== '' ? workspaceDir.trim() : null,
      })
      flash(result)
      if (result.ok) {
        setName('')
        setWorkspaceDir('')
        await refresh()
      }
    } catch (e) {
      setError(errText(e))
    } finally {
      setBusy(false)
    }
  }

  const onActivate = async (id: string): Promise<void> => {
    setBusy(true)
    try {
      flash(await window.closerai.activateProject(id))
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const onDeleteProject = async (id: string): Promise<void> => {
    if (!window.confirm('确定删除该项目？该操作不会删除项目目录下的文件。')) return
    setBusy(true)
    try {
      flash(await window.closerai.deleteProject(id))
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const onDeleteSession = async (session: SessionEntry): Promise<void> => {
    if (!window.confirm('确定删除该会话？该操作不可恢复。')) return
    setBusy(true)
    try {
      flash(await window.closerai.deleteSession(session.id))
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const onExportSession = async (session: SessionEntry): Promise<void> => {
    setBusy(true)
    try {
      const dest = await window.closerai.pickDirectory()
      if (dest === null) return
      const result = await window.closerai.exportSession(session.id, dest)
      if (result.ok) setNotice('已导出到 ' + result.path)
      else setError(result.error ?? '导出失败')
    } catch (e) {
      setError(errText(e))
    } finally {
      setBusy(false)
    }
  }

  const onImportSession = async (): Promise<void> => {
    setBusy(true)
    try {
      const src = await window.closerai.pickDirectory()
      if (src === null) return
      const result = await window.closerai.importSession(src)
      if (result.ok) {
        setNotice('已导入到 ' + result.path)
        setError('')
        await refresh()
      } else {
        setError(result.error ?? '导入失败')
      }
    } catch (e) {
      setError(errText(e))
    } finally {
      setBusy(false)
    }
  }

  const refreshDiagnostics = async (): Promise<void> => {
    setBusy(true)
    try {
      setDiag(await window.closerai.getDiagnostics())
      setError('')
    } catch (e) {
      setError(errText(e))
    } finally {
      setBusy(false)
    }
  }

  const onExportDiagnostics = async (): Promise<void> => {
    setBusy(true)
    try {
      const dest = await window.closerai.pickDirectory()
      if (dest === null) return
      const result = await window.closerai.exportDiagnostics(dest)
      if (result.ok) setNotice('诊断已导出到 ' + result.path)
      else setError(result.error ?? '导出失败')
    } catch (e) {
      setError(errText(e))
    } finally {
      setBusy(false)
    }
  }

  const setLoginItem = async (enabled: boolean): Promise<void> => {
    setBusy(true)
    try {
      flash(await window.closerai.setLaunchAtLogin(enabled))
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const onSaveCapabilities = async (): Promise<void> => {
    if (caps === null) return
    setBusy(true)
    try {
      flash(await window.closerai.setCapabilities(caps))
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  if (state === null)
    return (
      <main className="shell">
        <p>加载中…</p>
      </main>
    )
  const activeProject = state.projects.find((p: Project) => p.id === state.activeProjectId) ?? null

  return (
    <main className="shell manage">
      <header>
        <h1>CloserAI 工作区</h1>
        <p>管理项目、工作区与会话历史。切换项目会重启当前对话后端。</p>
        <p className="actions">
          <button onClick={() => void window.closerai.openChat()}>返回对话 (Ctrl+Shift+C)</button>
          <button onClick={() => void onCheckUpdate()}>检查更新</button>
        </p>
        {updateInfo !== '' && <p className="hint">{updateInfo}</p>}
      </header>

      {state.dshMode === 'system-sync' && (
        <div
          className="banner"
          style={{
            background: '#eef4ff',
            border: '1px solid #c9d8f5',
            borderRadius: 8,
            padding: '10px 14px',
            color: '#22407a',
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <strong>已与系统 DSH 同步</strong>
          <span>
            {' '}
            — 会话、插件与设置与你的 web 端 DSH 完全一致（~/.dsh）。请勿同时运行 web
            端与桌面端，以免冲突。
          </span>
        </div>
      )}

      {notice !== '' && <p className="ok">{notice}</p>}
      {error !== '' && <p className="bad">{error}</p>}

      <section className="card">
        <h2>当前模式</h2>
        <p>
          {activeProject === null
            ? '未绑定项目 · ' + MODE_LABEL[state.mode] + ' 模式'
            : '项目「' + activeProject.name + '」· ' + MODE_LABEL[activeProject.mode]}
        </p>
      </section>

      <section className="card">
        <h2>权限清单</h2>
        <p className="hint">
          当前模式「{MODE_LABEL[state.mode]}」设计授予的能力；实际启用的工具还受「能力设置」影响。
        </p>
        <ul className="list">
          {state.permissions
            .find((item) => item.mode === state.mode)
            ?.entries.map((entry) => (
              <li key={entry.tool}>
                <div className="row">
                  <strong>{entry.tool}</strong>
                  <span className="meta">{entry.permission}</span>
                </div>
              </li>
            ))}
        </ul>
      </section>

      <section className="card">
        <h2>新建项目</h2>
        <div className="grid">
          <label>
            名称
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：个人助手 / 文档处理 / 我的代码库"
            />
          </label>
          <label>
            模式
            <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
              <option value="chat">对话（无文件权限）</option>
              <option value="work">工作（应用沙箱文件）</option>
              <option value="code">代码（授权目录 + Shell）</option>
            </select>
          </label>
          {mode === 'code' && (
            <label>
              工作目录
              <div className="inline">
                <input
                  value={workspaceDir}
                  onChange={(e) => setWorkspaceDir(e.target.value)}
                  placeholder="授权目录绝对路径"
                />
                <button
                  onClick={() =>
                    void window.closerai
                      .pickDirectory()
                      .then((d) => d !== null && setWorkspaceDir(d))
                  }
                >
                  浏览…
                </button>
              </div>
            </label>
          )}
        </div>
        <button className="primary" disabled={busy} onClick={() => void onCreateProject()}>
          创建并启用
        </button>
      </section>

      <section className="card">
        <h2>项目</h2>
        {state.projects.length === 0 && <p>还没有项目。</p>}
        <ul className="list">
          {state.projects.map((p: Project) => (
            <li key={p.id} className={p.id === state.activeProjectId ? 'active' : ''}>
              <div className="row">
                <div>
                  <strong>{p.name}</strong>
                  <span className="meta">
                    {MODE_LABEL[p.mode]}
                    {p.workspaceDir === null ? '' : ' · ' + p.workspaceDir}
                  </span>
                </div>
                <div className="row-actions">
                  {p.id !== state.activeProjectId && (
                    <button disabled={busy} onClick={() => void onActivate(p.id)}>
                      切换
                    </button>
                  )}
                  <button disabled={busy} onClick={() => void onDeleteProject(p.id)}>
                    删除
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>能力设置</h2>
        <p className="hint">保存后会重新生成 Agent Preset 并重启对话后端。</p>
        {caps !== null && (
          <>
            <div className="grid">
              <label className="check">
                <input
                  type="checkbox"
                  checked={caps.webSearch}
                  onChange={(e) => setCaps({ ...caps, webSearch: e.target.checked })}
                />
                联网搜索（Chat / Work / Code）
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={caps.webFetch}
                  onChange={(e) => setCaps({ ...caps, webFetch: e.target.checked })}
                />
                网页抓取 fetch（依赖联网搜索开启）
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={caps.skills}
                  onChange={(e) => setCaps({ ...caps, skills: e.target.checked })}
                />
                技能 Skills（Code 模式）
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={state.launchAtLogin}
                  onChange={(e) => void setLoginItem(e.target.checked)}
                />
                开机启动（系统托盘）
              </label>
            </div>
            <button className="primary" disabled={busy} onClick={() => void onSaveCapabilities()}>
              保存能力设置
            </button>
          </>
        )}
      </section>

      <section className="card">
        <h2>MCP 服务器</h2>
        <p className="hint">
          管理可复用的 MCP 服务器（stdio 本地进程或 HTTP 端点），导出为标准 mcp.json 供 Claude Code
          / Kimi Code / 编辑器等任何 MCP 兼容客户端使用。配置保存在 CloserAI 本地（不修改 DSH
          配置）。
        </p>
        <div className="row-actions" style={{ marginBottom: 12 }}>
          <button
            disabled={busy}
            onClick={() => {
              resetMcpForm()
              setMcpEditId('')
            }}
          >
            ＋ 添加服务器
          </button>
          <button disabled={busy} onClick={() => void onExportMcp()}>
            导出 mcp.json…
          </button>
        </div>

        {mcpServers !== null && (
          <ul className="list">
            {mcpServers.length === 0 && (
              <li>
                <span className="meta">还没有配置 MCP 服务器。</span>
              </li>
            )}
            {mcpServers.map((server) => (
              <li key={server.id}>
                <div className="row">
                  <div>
                    <strong>{server.name}</strong>
                    <span className="meta">
                      {server.transport === 'stdio' ? 'stdio' : 'http'}
                      {server.transport === 'stdio'
                        ? ' · ' + (server.command ?? '（无命令）')
                        : ' · ' + (server.url ?? '（无 URL）')}
                      {server.description !== undefined && ' · ' + server.description}
                    </span>
                  </div>
                  <div className="row-actions">
                    <label className="check" style={{ margin: '0 8px 0 0' }}>
                      <input
                        type="checkbox"
                        checked={server.enabled}
                        onChange={() => void onToggleMcp(server)}
                      />
                      启用
                    </label>
                    <button disabled={busy} onClick={() => startEditMcp(server)}>
                      编辑
                    </button>
                    <button disabled={busy} onClick={() => void onRemoveMcp(server.id)}>
                      删除
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {(mcpEditId !== null || mcpEditId === '' || mcpName !== '') && (
          <div className="card-sub">
            <h3>{mcpEditId !== null && mcpEditId !== '' ? '编辑服务器' : '添加服务器'}</h3>
            <div className="grid">
              <label>
                名称
                <input
                  value={mcpName}
                  onChange={(e) => setMcpName(e.target.value)}
                  placeholder="例如：openviking / filesystem"
                />
              </label>
              <label>
                传输类型
                <select
                  value={mcpTransport}
                  onChange={(e) => setMcpTransport(e.target.value as McpTransport)}
                >
                  <option value="stdio">stdio（本地进程）</option>
                  <option value="http">HTTP（远程端点）</option>
                </select>
              </label>
              <label>
                描述（可选）
                <input
                  value={mcpDesc}
                  onChange={(e) => setMcpDesc(e.target.value)}
                  placeholder="这个服务器提供什么工具"
                />
              </label>
            </div>
            {mcpTransport === 'stdio' ? (
              <div className="grid">
                <label>
                  命令
                  <input
                    value={mcpCommand}
                    onChange={(e) => setMcpCommand(e.target.value)}
                    placeholder="例如：npx / python / node"
                  />
                </label>
                <label>
                  参数（空格分隔）
                  <input
                    value={mcpArgs}
                    onChange={(e) => setMcpArgs(e.target.value)}
                    placeholder="例如：-y @some/mcp-server"
                  />
                </label>
                <label>
                  环境变量（每行 KEY=VALUE）
                  <textarea value={mcpEnv} onChange={(e) => setMcpEnv(e.target.value)} rows={3} />
                </label>
              </div>
            ) : (
              <div className="grid">
                <label>
                  URL
                  <input
                    value={mcpUrl}
                    onChange={(e) => setMcpUrl(e.target.value)}
                    placeholder="例如：http://127.0.0.1:1933/mcp"
                  />
                </label>
                <label>
                  请求头（每行 KEY=VALUE）
                  <textarea
                    value={mcpHeaders}
                    onChange={(e) => setMcpHeaders(e.target.value)}
                    rows={3}
                    placeholder="Authorization=Bearer xxx"
                  />
                </label>
              </div>
            )}
            <div className="row-actions">
              <button className="primary" disabled={busy} onClick={() => void onSaveMcp()}>
                保存
              </button>
              <button disabled={busy} onClick={resetMcpForm}>
                取消
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <h2>诊断</h2>
        <p className="hint">查看 DSH 子进程状态与最近日志（已自动脱敏），或导出完整诊断报告。</p>
        <div className="row-actions" style={{ marginBottom: 12 }}>
          <button disabled={busy} onClick={() => void refreshDiagnostics()}>
            刷新
          </button>
          <button disabled={busy} onClick={() => void onExportDiagnostics()}>
            导出诊断…
          </button>
        </div>
        {diag !== null && (
          <div className="diag">
            <p className="meta">
              CloserAI {diag.appVersion} · {diag.platform} · 模式 {diag.mode} · 项目{' '}
              {diag.activeProjectName ?? '（无）'} · 会话 {diag.sessionCount} 个 · DSH{' '}
              {diag.supervisorState} (pid {diag.supervisorPid ?? 'n/a'})
            </p>
            <button onClick={() => setShowLogs((v) => !v)}>
              {showLogs ? '收起日志' : '显示最近日志 (' + diag.logLines.length + ' 行)'}
            </button>
            {showLogs && (
              <pre className="logview">
                {diag.logLines.length === 0
                  ? '（暂无日志）'
                  : diag.logLines
                      .slice(-20)
                      .map((l) => l.text)
                      .join('\n')}
              </pre>
            )}
          </div>
        )}
      </section>

      <section className="card">
        <h2>会话历史</h2>
        <p className="actions">
          <button disabled={busy} onClick={() => void onImportSession()}>
            导入会话…
          </button>
        </p>
        {state.sessions.length === 0 && (
          <p>暂无会话记录。回到对话开始聊天后，会话会自动保存在本地。</p>
        )}
        <ul className="list">
          {state.sessions.map((s: SessionEntry) => (
            <li key={s.id}>
              <div className="row">
                <div>
                  <strong>{shortId(s.id)}</strong>
                  <span className="meta">
                    {formatTime(s.mtimeMs)} · {formatBytes(s.sizeBytes)} · {s.fileCount} 个文件 ·{' '}
                    {s.workspaceKey}
                  </span>
                </div>
                <div className="row-actions">
                  <button disabled={busy} onClick={() => void onExportSession(s)}>
                    导出
                  </button>
                  <button disabled={busy} onClick={() => void onDeleteSession(s)}>
                    删除
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <footer>
        <p>
          提示：在对话页面按 Ctrl+Shift+M 打开本页；会话标题与消息内容由 DeepSeek Harness 管理，
          本页仅管理会话文件的备份与清理。
        </p>
      </footer>
    </main>
  )
}
