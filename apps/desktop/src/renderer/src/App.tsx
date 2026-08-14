import { useEffect, useState } from 'react'
import type { ConnectivityResult, ProviderKind, ProviderProfile } from '../../shared/types'

type Kind = ProviderKind

interface FormState {
  name: string
  baseUrl: string
  defaultModel: string
  modelsText: string
  apiKey: string
}

function toProfile(kind: Kind, form: FormState): ProviderProfile {
  const models = form.modelsText
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
  return {
    id: kind === 'mock' ? 'mock' : kind === 'deepseek' ? 'deepseek-official' : 'openai-compatible',
    kind,
    name:
      form.name.trim() ||
      (kind === 'deepseek' ? 'DeepSeek' : kind === 'mock' ? 'Mock（离线）' : '自定义 Provider'),
    baseUrl: form.baseUrl.trim(),
    defaultModel: form.defaultModel.trim(),
    models: models.map((model) => ({ id: model })),
  }
}

export function App(): React.JSX.Element {
  const [kind, setKind] = useState<Kind>('deepseek')
  const [form, setForm] = useState<FormState>({
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-v4-pro',
    modelsText: 'deepseek-v4-flash, deepseek-v4-pro',
    apiKey: '',
  })
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testResult, setTestResult] = useState<ConnectivityResult | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    void window.closerai.getDefaults().then(({ deepseek, mock }) => {
      const base = kind === 'mock' ? mock : deepseek
      setForm({
        name: base.name,
        baseUrl: base.baseUrl,
        defaultModel: base.defaultModel,
        modelsText: base.models.map((model) => model.id).join(', '),
        apiKey: kind === 'mock' ? 'offline' : '',
      })
    })
  }, [kind])

  const update = (patch: Partial<FormState>): void => {
    setForm((previous) => ({ ...previous, ...patch }))
    setTestResult(null)
  }

  const profile = toProfile(kind, form)

  const onTest = async (): Promise<void> => {
    setTesting(true)
    setTestResult(null)
    setError('')
    try {
      const result = await window.closerai.testProvider({ profile, apiKey: form.apiKey })
      setTestResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setTesting(false)
    }
  }

  const onSave = async (): Promise<void> => {
    setSaving(true)
    setError('')
    try {
      await window.closerai.saveProvider({ profile, apiKey: kind === 'mock' ? '' : form.apiKey })
      await window.closerai.completeOnboarding()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSaving(false)
    }
  }

  return (
    <main className="shell">
      <header>
        <h1>CloserAI</h1>
        <p>配置模型服务即可开始使用。API Key 将安全存储在系统钥匙串中。</p>
      </header>

      <section className="modes">
        {(
          [
            ['deepseek', 'DeepSeek'],
            ['openai-compatible', 'OpenAI 兼容'],
            ['mock', 'Mock（离线）'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            className={kind === value ? 'mode active' : 'mode'}
            onClick={() => setKind(value)}
          >
            {label}
          </button>
        ))}
      </section>

      <section className="form">
        <label>
          名称
          <input value={form.name} onChange={(event) => update({ name: event.target.value })} />
        </label>

        {kind !== 'mock' && (
          <label>
            接口地址（含 /v1）
            <input
              value={form.baseUrl}
              onChange={(event) => update({ baseUrl: event.target.value })}
            />
          </label>
        )}

        <label>
          默认模型
          <input
            value={form.defaultModel}
            onChange={(event) => update({ defaultModel: event.target.value })}
          />
        </label>

        <label>
          模型列表（逗号分隔）
          <input
            value={form.modelsText}
            onChange={(event) => update({ modelsText: event.target.value })}
          />
        </label>

        {kind !== 'mock' && (
          <label>
            API Key
            <input
              type="password"
              value={form.apiKey}
              onChange={(event) => update({ apiKey: event.target.value })}
              placeholder="sk-..."
            />
          </label>
        )}

        {testResult !== null && (
          <p className={testResult.ok ? 'ok' : 'bad'}>
            {testResult.ok ? '连接成功。' : `连接失败：${testResult.error ?? '未知原因'}`}
          </p>
        )}
        {error !== '' && <p className="bad">{error}</p>}

        <footer>
          {kind !== 'mock' && (
            <button disabled={testing} onClick={() => void onTest()}>
              {testing ? '测试中…' : '测试连接'}
            </button>
          )}
          <button className="primary" disabled={saving} onClick={() => void onSave()}>
            {saving ? '启动中…' : '保存并启动'}
          </button>
        </footer>
      </section>
    </main>
  )
}
