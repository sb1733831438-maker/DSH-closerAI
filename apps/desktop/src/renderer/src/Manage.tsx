import { useEffect, useState } from 'react'
import type { AppState, Mode, OpResult, Project, SessionEntry } from '../../shared/types'

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

export function Manage(): React.JSX.Element {
  const [state, setState] = useState<AppState | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState('')
  const [mode, setMode] = useState<Mode>('chat')
  const [workspaceDir, setWorkspaceDir] = useState('')

  const refresh = async (): Promise<void> => {
    setState(await window.closerai.getAppState())
  }

  useEffect(() => {
    void refresh().catch((e) => setError(errText(e)))
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
        </p>
      </header>

      {notice !== '' && <p className="ok">{notice}</p>}
      {error !== '' && <p className="bad">{error}</p>}

      <section className="card">
        <h2>当前模式</h2>
        <p>
          {activeProject !== null
            ? '项目「' + activeProject.name + '」· ' + MODE_LABEL[activeProject.mode]
            : '未绑定项目 · ' + MODE_LABEL[state.mode] + ' 模式'}
        </p>
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
                    {p.workspaceDir !== null ? ' · ' + p.workspaceDir : ''}
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
