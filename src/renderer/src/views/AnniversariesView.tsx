import { useMemo, useState } from 'react'
import type {
  Anniversary,
  AnniversaryInput,
  AnniversaryRepeat
} from '../../../shared/types'
import { Icon } from '../components/Icon'
import { countdownFor, sortByCountdown } from '../lib/anniversaries'
import { formatDayDate, todayISO } from '../lib/date'
import { useWorkspace } from '../state/WorkspaceContext'

const ANNIVERSARY_COLORS = [
  '#8a6a3f',
  '#c2410c',
  '#be123c',
  '#7c3aed',
  '#2563eb',
  '#0f766e',
  '#4d7c0f',
  '#4a4a4a'
]

function AnniversaryModal({
  anniversary,
  onClose
}: {
  anniversary?: Anniversary
  onClose: () => void
}): React.JSX.Element {
  const { createAnniversary, updateAnniversary } = useWorkspace()
  const [title, setTitle] = useState(anniversary?.title ?? '')
  const [date, setDate] = useState(anniversary?.date ?? todayISO())
  const [repeat, setRepeat] = useState<AnniversaryRepeat>(
    anniversary?.repeat ?? 'yearly'
  )
  const [note, setNote] = useState(anniversary?.note ?? '')
  const [color, setColor] = useState(anniversary?.color ?? ANNIVERSARY_COLORS[0])
  const [saving, setSaving] = useState(false)

  const palette = Array.from(
    new Set([...ANNIVERSARY_COLORS, anniversary?.color].filter(Boolean) as string[])
  )

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    if (!title.trim() || saving) return

    setSaving(true)
    const input: AnniversaryInput = {
      title: title.trim(),
      date,
      repeat,
      note,
      color
    }

    if (anniversary) {
      await updateAnniversary(anniversary.id, input)
    } else {
      await createAnniversary(input)
    }

    setSaving(false)
    onClose()
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <form className="modal" onSubmit={handleSubmit}>
        <div className="modal-header">
          <h2 className="modal-title">
            {anniversary ? '编辑纪念日' : '新建纪念日'}
          </h2>
          <button type="button" className="icon-button" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="form">
          <div className="field">
            <label htmlFor="anniversary-title">名称</label>
            <input
              id="anniversary-title"
              className="input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例如：生日、入职纪念、项目上线"
              autoFocus
            />
          </div>

          <div className="row">
            <div className="field">
              <label htmlFor="anniversary-date">日期</label>
              <input
                id="anniversary-date"
                className="input"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="anniversary-repeat">重复</label>
              <select
                id="anniversary-repeat"
                className="select"
                value={repeat}
                onChange={(event) =>
                  setRepeat(event.target.value as AnniversaryRepeat)
                }
              >
                <option value="yearly">每年重复</option>
                <option value="once">仅一次</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label>颜色</label>
            <div className="swatches">
              {palette.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={item === color ? 'swatch active' : 'swatch'}
                  style={{ background: item }}
                  onClick={() => setColor(item)}
                  aria-label={`选择颜色 ${item}`}
                />
              ))}
            </div>
          </div>

          <div className="field">
            <label htmlFor="anniversary-note">备注</label>
            <textarea
              id="anniversary-note"
              className="textarea"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="想记住的细节（可选）"
            />
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={onClose}>
            取消
          </button>
          <button
            type="submit"
            className="primary-button"
            disabled={!title.trim() || saving}
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </form>
    </div>
  )
}

export function AnniversariesView(): React.JSX.Element {
  const { anniversaries, deleteAnniversary } = useWorkspace()
  const [modal, setModal] = useState<{ anniversary?: Anniversary } | null>(null)
  const today = todayISO()

  const items = useMemo(() => sortByCountdown(anniversaries, today), [
    anniversaries,
    today
  ])

  async function handleDelete(item: Anniversary): Promise<void> {
    if (!window.confirm(`确定删除纪念日「${item.title}」吗？`)) return
    await deleteAnniversary(item.id)
  }

  return (
    <div className="anniversary-page">
      <div className="view-toolbar">
        <span className="muted">共 {anniversaries.length} 个纪念日</span>
        <button className="primary-button" onClick={() => setModal({})}>
          <Icon name="plus" size={16} />
          新建纪念日
        </button>
      </div>

      {items.length === 0 ? (
        <div className="card panel empty-state large">
          <span className="empty-icon">
            <Icon name="gift" size={24} />
          </span>
          <div>
            <strong>还没有纪念日</strong>
            <p>把生日、纪念日和重要节点记下来，每天都能看到倒数。</p>
          </div>
          <button className="primary-button" onClick={() => setModal({})}>
            <Icon name="plus" size={16} />
            添加第一个纪念日
          </button>
        </div>
      ) : (
        <div className="anniversary-grid">
          {items.map((item) => {
            const countdown = countdownFor(item, today)
            const past = item.repeat === 'once' && countdown.days < 0
            return (
              <article
                className={past ? 'anniversary-card card past' : 'anniversary-card card'}
                key={item.id}
              >
                <span
                  className="anniversary-stripe"
                  style={{ background: item.color }}
                />
                <div className="anniversary-head">
                  <span className="anniversary-title">{item.title}</span>
                  <span className="anniversary-repeat">
                    {item.repeat === 'yearly' ? '每年' : '仅一次'}
                  </span>
                </div>

                <div className="anniversary-count" style={{ color: item.color }}>
                  {countdown.days === 0 ? (
                    <span className="anniversary-today">今天</span>
                  ) : (
                    <>
                      <strong>{Math.abs(countdown.days)}</strong>
                      <span>{past ? '天前' : '天'}</span>
                    </>
                  )}
                </div>

                <div className="anniversary-meta">
                  <span>
                    <Icon name="calendar" size={13} />
                    {formatDayDate(item.date)}
                  </span>
                  {item.repeat === 'yearly' && (
                    <span>
                      <Icon name="target" size={13} />
                      下次 {formatDayDate(countdown.nextDate)}
                    </span>
                  )}
                </div>

                <div className="anniversary-label">{countdown.label}</div>
                {item.note && <p className="anniversary-note">{item.note}</p>}

                <div className="anniversary-actions">
                  <button
                    className="icon-button tiny"
                    title="编辑纪念日"
                    onClick={() => setModal({ anniversary: item })}
                  >
                    <Icon name="pen" size={14} />
                  </button>
                  <button
                    className="icon-button tiny"
                    title="删除纪念日"
                    onClick={() => void handleDelete(item)}
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {modal && (
        <AnniversaryModal
          anniversary={modal.anniversary}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
