import { useEffect, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import {
  formatDayDate,
  formatFullDate,
  parseISODate,
  toISODate,
  todayISO
} from '../lib/date'
import { MOODS, moodLabel } from '../lib/moods'
import { useWorkspace } from '../state/WorkspaceContext'

function shiftDate(iso: string, delta: number): string {
  const date = parseISODate(iso)
  date.setDate(date.getDate() + delta)
  return toISODate(date)
}

export function ReflectionsView(): React.JSX.Element {
  const { reflections, saveReflection } = useWorkspace()
  const [date, setDate] = useState(todayISO())
  const [content, setContent] = useState('')
  const [mood, setMood] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const current = reflections.find((item) => item.date === date)

  useEffect(() => {
    const reflection = reflections.find((item) => item.date === date)
    setContent(reflection?.content ?? '')
    setMood(reflection?.mood ?? '')
    setStatus('idle')
  }, [date])

  function scheduleSave(nextContent: string, nextMood: string): void {
    if (saveTimer.current) clearTimeout(saveTimer.current)

    setStatus('saving')
    saveTimer.current = setTimeout(async () => {
      await saveReflection({ date, content: nextContent, mood: nextMood })
      setStatus('saved')
    }, 700)
  }

  function handleContent(value: string): void {
    setContent(value)
    scheduleSave(value, mood)
  }

  function handleMood(value: string): void {
    const next = mood === value ? '' : value
    setMood(next)
    scheduleSave(content, next)
  }

  async function clearReflection(): Promise<void> {
    if (!window.confirm('确定删除这篇感想吗？')) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setContent('')
    setMood('')
    await saveReflection({ date, content: '', mood: '' })
    setStatus('saved')
  }

  const recent = [...reflections].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="reflection-layout">
      <section className="card panel reflection-editor">
        <div className="reflection-toolbar">
          <div className="date-nav">
            <button
              className="icon-button"
              title="前一天"
              onClick={() => setDate(shiftDate(date, -1))}
            >
              <Icon name="chevron-left" size={16} />
            </button>
            <div className="date-nav-title">
              <strong>{formatFullDate(date)}</strong>
              <span>{date === todayISO() ? '今天' : ''}</span>
            </div>
            <button
              className="icon-button"
              title="后一天"
              onClick={() => setDate(shiftDate(date, 1))}
            >
              <Icon name="chevron-right" size={16} />
            </button>
          </div>
          <button className="ghost-button" onClick={() => setDate(todayISO())}>
            回到今天
          </button>
        </div>

        <div className="mood-row">
          <span className="mood-label">今天心情</span>
          <div className="mood-options">
            {MOODS.map((item) => (
              <button
                key={item.value}
                className={mood === item.value ? 'mood-button active' : 'mood-button'}
                onClick={() => handleMood(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <textarea
          className="reflection-textarea"
          value={content}
          onChange={(event) => handleContent(event.target.value)}
          placeholder="今天发生了什么？有什么想法或感受？"
        />

        <div className="reflection-footer">
          <span className="save-status">
            {status === 'saving'
              ? '正在保存…'
              : status === 'saved'
                ? '已自动保存'
                : '修改后自动保存'}
          </span>
          {current && (
            <button className="ghost-button danger-text" onClick={() => void clearReflection()}>
              删除这篇
            </button>
          )}
        </div>
      </section>

      <aside className="card panel reflection-list">
        <div className="panel-head">
          <h3>近期感想</h3>
          <span className="muted">{reflections.length} 篇</span>
        </div>

        {recent.length === 0 ? (
          <div className="empty-state compact">
            <span className="empty-icon">
              <Icon name="pen" size={22} />
            </span>
            <div>
              <strong>还没有感想</strong>
              <p>从今天开始，每天写一段话留给自己。</p>
            </div>
          </div>
        ) : (
          <ul className="reflection-recent">
            {recent.map((item) => (
              <li key={item.id}>
                <button
                  className={item.date === date ? 'recent-item active' : 'recent-item'}
                  onClick={() => setDate(item.date)}
                >
                  <div className="recent-head">
                    <span className="recent-date">{formatDayDate(item.date)}</span>
                    {item.mood && (
                      <span className="mood-badge">{moodLabel(item.mood)}</span>
                    )}
                  </div>
                  <p className="recent-text">
                    {item.content.trim() || '（只记录了心情）'}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  )
}
