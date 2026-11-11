import { useEffect, useRef, useState } from 'react'
import { Icon } from '../components/Icon'

export function QuickCapture(): React.JSX.Element {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.body.classList.add('quick-mode')

    void window.api.getSnapshot().then((snapshot) => {
      document.documentElement.style.setProperty(
        '--accent',
        snapshot.settings.accent
      )
    })

    const focusInput = (): void => inputRef.current?.focus()
    focusInput()
    window.addEventListener('focus', focusInput)

    return () => {
      document.body.classList.remove('quick-mode')
      window.removeEventListener('focus', focusInput)
    }
  }, [])

  async function submit(): Promise<void> {
    const value = text.trim()
    if (!value || saving) return

    setSaving(true)
    await window.api.saveCapture(value)
    setText('')
    setSaving(false)
    window.api.hideQuickCapture()
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Enter') {
      event.preventDefault()
      void submit()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      window.api.hideQuickCapture()
    }
  }

  return (
    <div className="quick-root">
      <div className="quick-card">
        <div className="quick-top">
          <Icon name="spark" size={14} />
          <span>快速记录</span>
        </div>
        <input
          ref={inputRef}
          className="quick-input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="记点什么…"
          spellCheck={false}
        />
        <div className="quick-hint">
          <span>保存后会自动出现在工作台的今日视图中</span>
          <span>
            <kbd>Enter</kbd> 保存 · <kbd>Esc</kbd> 关闭
          </span>
        </div>
      </div>
    </div>
  )
}
