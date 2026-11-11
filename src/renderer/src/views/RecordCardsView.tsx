import { useMemo, useState } from 'react'
import type { RecordCard } from '../../../shared/types'
import { Icon } from '../components/Icon'
import { formatDayDate, todayISO } from '../lib/date'
import { useWorkspace } from '../state/WorkspaceContext'

const CARD_COLORS = [
  '#2563eb',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#8b5cf6',
  '#14b8a6'
]

const CATEGORY_SUGGESTIONS = ['获奖', '里程碑', '纪念', '成就', '记录']

function RecordCardModal({
  card,
  onClose
}: {
  card?: RecordCard
  onClose: () => void
}): React.JSX.Element {
  const { createRecordCard, updateRecordCard } = useWorkspace()
  const [date, setDate] = useState(card?.date ?? todayISO())
  const [title, setTitle] = useState(card?.title ?? '')
  const [category, setCategory] = useState(card?.category ?? '记录')
  const [description, setDescription] = useState(card?.description ?? '')
  const [color, setColor] = useState(card?.color ?? CARD_COLORS[0])
  const [saving, setSaving] = useState(false)

  const palette = Array.from(
    new Set([...CARD_COLORS, card?.color].filter(Boolean) as string[])
  )

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    if (!title.trim() || saving) return

    setSaving(true)
    if (card) {
      await updateRecordCard(card.id, {
        date,
        title: title.trim(),
        category,
        description,
        color
      })
    } else {
      await createRecordCard({
        date,
        title: title.trim(),
        category,
        description,
        color
      })
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
          <h2 className="modal-title">{card ? '编辑记录卡' : '新建记录卡'}</h2>
          <button type="button" className="icon-button" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="form">
          <div className="row">
            <div className="field">
              <label htmlFor="record-date">日期</label>
              <input
                id="record-date"
                className="input"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="record-category">类型</label>
              <input
                id="record-category"
                className="input"
                list="record-categories"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="获奖 / 里程碑 / 纪念"
              />
              <datalist id="record-categories">
                {CATEGORY_SUGGESTIONS.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="field">
            <label htmlFor="record-title">标题</label>
            <input
              id="record-title"
              className="input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例如：拿到了第一个比赛奖项"
              autoFocus
            />
          </div>

          <div className="field">
            <label htmlFor="record-desc">描述</label>
            <textarea
              id="record-desc"
              className="textarea"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="记下当时的细节和感受"
            />
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
        </div>

        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={onClose}>
            取消
          </button>
          <button className="primary-button" type="submit" disabled={!title.trim() || saving}>
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </form>
    </div>
  )
}

export function RecordCardsView(): React.JSX.Element {
  const { recordCards, deleteRecordCard } = useWorkspace()
  const [modal, setModal] = useState<{ card?: RecordCard } | null>(null)
  const [filter, setFilter] = useState('全部')

  const categories = useMemo(() => {
    const set = new Set(recordCards.map((card) => card.category))
    return ['全部', ...Array.from(set)]
  }, [recordCards])

  const cards = useMemo(() => {
    const filtered =
      filter === '全部'
        ? recordCards
        : recordCards.filter((card) => card.category === filter)
    return [...filtered].sort((a, b) =>
      a.date === b.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date)
    )
  }, [recordCards, filter])

  async function handleDelete(card: RecordCard): Promise<void> {
    if (!window.confirm(`确定删除「${card.title}」吗？`)) return
    await deleteRecordCard(card.id)
  }

  return (
    <div className="records-page">
      <div className="view-toolbar">
        <div className="segmented wrap">
          {categories.map((category) => (
            <button
              key={category}
              className={category === filter ? 'segment active' : 'segment'}
              onClick={() => setFilter(category)}
            >
              {category}
            </button>
          ))}
        </div>
        <button className="primary-button" onClick={() => setModal({})}>
          <Icon name="plus" size={16} />
          新建记录
        </button>
      </div>

      {cards.length === 0 ? (
        <div className="card panel empty-state large">
          <span className="empty-icon">
            <Icon name="award" size={24} />
          </span>
          <div>
            <strong>还没有记录卡</strong>
            <p>把获奖、里程碑和值得纪念的瞬间按日期保存下来。</p>
          </div>
          <button className="primary-button" onClick={() => setModal({})}>
            <Icon name="plus" size={16} />
            写第一张记录卡
          </button>
        </div>
      ) : (
        <div className="record-grid">
          {cards.map((card) => (
            <article className="record-card card" key={card.id}>
              <span className="record-stripe" style={{ background: card.color }} />
              <div className="record-head">
                <span className="record-date">{formatDayDate(card.date)}</span>
                <span
                  className="record-category"
                  style={{
                    color: card.color,
                    background: `${card.color}14`
                  }}
                >
                  {card.category}
                </span>
              </div>
              <h3 className="record-title">{card.title}</h3>
              {card.description && (
                <p className="record-desc">{card.description}</p>
              )}
              <div className="record-actions">
                <button
                  className="icon-button tiny"
                  title="编辑记录卡"
                  onClick={() => setModal({ card })}
                >
                  <Icon name="pen" size={14} />
                </button>
                <button
                  className="icon-button tiny"
                  title="删除记录卡"
                  onClick={() => void handleDelete(card)}
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {modal && <RecordCardModal card={modal.card} onClose={() => setModal(null)} />}
    </div>
  )
}
