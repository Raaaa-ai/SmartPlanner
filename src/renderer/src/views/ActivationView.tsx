import { useEffect, useState } from 'react'
import type { LicenseStatus } from '../../../shared/types'
import { Icon } from '../components/Icon'

export function ActivationView(): React.JSX.Element {
  const [status, setStatus] = useState<LicenseStatus | null>(null)
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    void window.api.getLicenseStatus().then(setStatus)
  }, [])

  async function copyMachineCode(): Promise<void> {
    if (!status) return
    await window.api.copyText(status.machineCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    if (!code.trim() || busy) return

    setBusy(true)
    setError('')
    setMessage('')
    const result = await window.api.activateLicense(code)
    if (!result.ok) {
      setError(result.message)
      setBusy(false)
      return
    }

    setMessage('激活成功，正在进入工作台…')
    setStatus(result.status)
  }

  if (!status) {
    return (
      <div className="activation-screen">
        <div className="activation-card">
          <span className="spinner" />
          <p className="muted">正在读取本机信息…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="activation-screen">
      <div className="activation-card">
        <div className="activation-brand">
          <span className="activation-logo">S</span>
          <div>
            <h1>SmartPlanner</h1>
            <p>本地优先的个人工作台</p>
          </div>
        </div>

        <div className="activation-intro">
          <h2>激活后使用</h2>
          <p>
            软件不设账号和登录，激活码只与当前电脑绑定。
            把下面的机器码发送给软件提供者，换取专属激活码后粘贴到下方即可。
          </p>
        </div>

        <div className="activation-section">
          <div className="activation-label">
            <span>本机机器码</span>
            <span className="muted">SP / Windows</span>
          </div>
          <div className="machine-code-row">
            <code className="machine-code">{status.machineCode}</code>
            <button
              type="button"
              className="ghost-button"
              onClick={() => void copyMachineCode()}
            >
              <Icon name={copied ? 'check' : 'copy'} size={15} />
              {copied ? '已复制' : '复制'}
            </button>
          </div>
        </div>

        <form className="activation-section" onSubmit={handleSubmit}>
          <label className="activation-label" htmlFor="activation-code">
            <span>激活码</span>
            <span className="muted">粘贴后点击激活</span>
          </label>
          <textarea
            id="activation-code"
            className="textarea activation-input"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="粘贴以 SP1. 开头的激活码…"
            spellCheck={false}
          />

          {error && <p className="activation-message error">{error}</p>}
          {message && <p className="activation-message success">{message}</p>}

          <button
            className="primary-button activation-submit"
            type="submit"
            disabled={!code.trim() || busy}
          >
            {busy ? '正在激活…' : '激活'}
          </button>
        </form>

        <div className="activation-footer">
          <span>激活码仅对当前电脑有效，重装系统后需要重新签发。</span>
          <button
            type="button"
            className="ghost-button"
            onClick={() => window.api.quitApp()}
          >
            退出
          </button>
        </div>
      </div>
    </div>
  )
}
