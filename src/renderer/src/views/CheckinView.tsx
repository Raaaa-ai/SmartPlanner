import { useMemo, useState } from 'react'
import type {
  Checkin,
  CheckinInput,
  CheckinPeriod,
  CheckinRecord
} from '../../../shared/types'
import { Icon } from '../components/Icon'
import { addDaysISO, parseISODate, toISODate, todayISO } from '../lib/date'
import { useWorkspace } from '../state/WorkspaceContext'

const CHECKIN_COLORS = [
  '#3f5d4e',
  '#2f3e5c',
  '#8a6a3f',
  '#9a4a35',
  '#6b5b7a',
  '#3c6e71',
  '#a37b5c',
  '#4a5568'
]

const PERIOD_LABEL: Record<CheckinPeriod, string> = {
  week: '本周',
  month: '本月',
  year: '今年'
}

const PERIOD_UNIT: Record<CheckinPeriod, string> = {
  week: '天 / 周',
  month: '天 / 月',
  year: '天 / 年'
}

function defaultTarget(period: CheckinPeriod): number {
  if (period === 'week') return 5
  if (period === 'year') return 100
  return 20
}

function monthDays(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7
  const total = new Date(year, month + 1, 0).getDate()
  const cells: (string | null)[] = Array.from({ length: offset }, () => null)
  for (let day = 1; day <= total; day += 1) {
    cells.push(toISODate(new Date(year, month, day)))
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function periodStart(period: CheckinPeriod, reference: Date): Date {
  if (period === 'week') {
    const start = new Date(reference)
    const offset = (start.getDay() + 6) % 7
    start.setDate(start.getDate() - offset)
    start.setHours(0, 0, 0, 0)
    return start
  }
  if (period === 'month') {
    return new Date(reference.getFullYear(), reference.getMonth(), 1)
  }
  return new Date(reference.getFullYear(), 0, 1)
}

function periodEnd(period: CheckinPeriod, reference: Date): Date {
  if (period === 'week') {
    const start = periodStart(period, reference)
    start.setDate(start.getDate() + 7)
    return start
  }
  if (period === 'month') {
    return new Date(reference.getFullYear(), reference.getMonth() + 1, 1)
  }
  return new Date(reference.getFullYear() + 1, 0, 1)
}

function countInPeriod(
  records: CheckinRecord[],
  checkinId: string,
  period: CheckinPeriod,
  reference: Date
): number {
  const start = periodStart(period, reference).getTime()
  const end = periodEnd(period, reference).getTime()
  return records.filter((record) => {
    if (record.checkinId !== checkinId) return false
    const time = parseISODate(record.date).getTime()
    return time >= start && time < end
  }).length
}

function currentStreak(records: CheckinRecord[], checkinId: string): number {
  const dates = new Set(
    records.filter((record) => record.checkinId === checkinId).map((record) => record.date)
  )
  let cursor = todayISO()
  if (!dates.has(cursor)) cursor = addDaysISO(cursor, -1)
  let count = 0
  while (dates.has(cursor)) {
    count += 1
    cursor = addDaysISO(cursor, -1)
  }
  return count
}

function CheckinEditorModal({
  checkin,
  onClose
}: {
  checkin?: Checkin
  onClose: () => void
}): React.JSX.Element {
  const { createCheckin, updateCheckin } = useWorkspace()
  const [name, setName] = useState(checkin?.name ?? '')
  const [period, setPeriod] = useState<CheckinPeriod>(checkin?.period ?? 'month')
  const [targetDays, setTargetDays] = useState(
    checkin?.targetDays ?? defaultTarget(checkin?.period ?? 'month')
  )
  const [color, setColor] = useState(checkin?.color ?? CHECKIN_COLORS[0])
  const [note, setNote] = useState(checkin?.note ?? '')
  const [targetTouched, setTargetTouched] = useState(Boolean(checkin))
  const [saving, setSaving] = useState(false)
  const invalidTarget =
    !Number.isFinite(targetDays) || targetDays < 1 || targetDays > 366

  function changePeriod(next: CheckinPeriod): void {
    setPeriod(next)
    if (!targetTouched) setTargetDays(defaultTarget(next))
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    if (!name.trim() || saving) return

    setSaving(true)
    const input: CheckinInput = {
      name: name.trim(),
      period,
      targetDays,
      color,
      note
    }

    if (checkin) await updateCheckin(checkin.id, input)
    else await createCheckin(input)

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
      <form className="modal checkin-modal" onSubmit={handleSubmit}>
        <div className="modal-header">
          <h2 className="modal-title">
            {checkin ? '编辑打卡目标' : '新建打卡目标'}
          </h2>
          <button type="button" className="icon-button" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="form">
          <div className="field">
            <label htmlFor="checkin-name">目标名称</label>
            <input
              id="checkin-name"
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="例如：运动、阅读、早睡"
              autoFocus
            />
          </div>

          <div className="row">
            <div className="field">
              <label htmlFor="checkin-period">统计周期</label>
              <select
                id="checkin-period"
                className="select"
                value={period}
                onChange={(event) =>
                  changePeriod(event.target.value as CheckinPeriod)
                }
              >
                <option value="week">每周</option>
                <option value="month">每月（默认）</option>
                <option value="year">每年</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="checkin-target">目标天数</label>
              <input
                id="checkin-target"
                className="input"
                type="number"
                min={1}
                max={366}
                value={targetDays}
                onChange={(event) => {
                  setTargetTouched(true)
                  setTargetDays(Number(event.target.value))
                }}
              />
            </div>
          </div>

          <div className="field">
            <label>颜色</label>
            <div className="swatches">
              {CHECKIN_COLORS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={item === color ? 'swatch active' : 'swatch'}
                  style={{ background: item }}
                  onClick={() => setColor(item)}
                  aria-label={`打卡颜色 ${item}`}
                />
              ))}
            </div>
          </div>

          <div className="field">
            <label htmlFor="checkin-note">备注</label>
            <textarea
              id="checkin-note"
              className="textarea"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="为什么想做这件事？（可选）"
            />
          </div>

          <p className={invalidTarget ? 'hint danger-text' : 'hint'}>
            {invalidTarget
              ? '目标天数需要在 1 到 366 之间。'
              : `${PERIOD_LABEL[period]}目标：${targetDays} 天。打卡记录会按日期保存，可在日历上补打或取消。`}
          </p>
        </div>

        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={onClose}>
            取消
          </button>
          <button
            className="primary-button"
            type="submit"
            disabled={!name.trim() || invalidTarget || saving}
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </form>
    </div>
  )
}

export function CheckinView(): React.JSX.Element {
  const {
    checkins,
    checkinRecords,
    deleteCheckin,
    toggleCheckin
  } = useWorkspace()
  const [editor, setEditor] = useState<{ checkin?: Checkin } | null>(null)
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  const today = todayISO()
  const cells = useMemo(() => monthDays(cursor.year, cursor.month), [cursor])
  const monthTitle = `${cursor.year}年${cursor.month + 1}月`
  const isCurrentMonth = (() => {
    const now = new Date()
    return now.getFullYear() === cursor.year && now.getMonth() === cursor.month
  })()
  const referenceDate = isCurrentMonth
    ? new Date()
    : new Date(cursor.year, cursor.month, 1)

  const monthRecords = checkinRecords.filter((record) => {
    const date = parseISODate(record.date)
    return date.getFullYear() === cursor.year && date.getMonth() === cursor.month
  })

  const todayChecked = checkins.filter((checkin) =>
    checkinRecords.some(
      (record) => record.checkinId === checkin.id && record.date === today
    )
  ).length

  const reachedTarget = checkins.filter(
    (checkin) =>
      countInPeriod(checkinRecords, checkin.id, checkin.period, new Date()) >=
      checkin.targetDays
  ).length

  function shiftMonth(delta: number): void {
    setCursor((prev) => {
      const date = new Date(prev.year, prev.month + delta, 1)
      return { year: date.getFullYear(), month: date.getMonth() }
    })
  }

  function removeCheckin(checkin: Checkin): void {
    if (
      !window.confirm(
        `确定删除「${checkin.name}」吗？该目标的打卡记录也会一起删除。`
      )
    ) {
      return
    }
    void deleteCheckin(checkin.id)
  }

  return (
    <div className="checkin-page">
      <div className="view-toolbar">
        <div className="checkin-month-nav">
          <button className="icon-button" onClick={() => shiftMonth(-1)} title="上个月">
            <Icon name="chevron-left" size={16} />
          </button>
          <strong>{monthTitle}</strong>
          <button className="icon-button" onClick={() => shiftMonth(1)} title="下个月">
            <Icon name="chevron-right" size={16} />
          </button>
          {!isCurrentMonth && (
            <button
              className="ghost-button"
              onClick={() => {
                const now = new Date()
                setCursor({ year: now.getFullYear(), month: now.getMonth() })
              }}
            >
              回到本月
            </button>
          )}
        </div>
        <button className="primary-button" onClick={() => setEditor({})}>
          <Icon name="plus" size={16} />
          新建打卡目标
        </button>
      </div>

      <section className="stats-grid">
        <div className="stat-card card">
          <span className="stat-icon">
            <Icon name="flame" size={18} />
          </span>
          <div>
            <div className="stat-label">本月打卡</div>
            <div className="stat-value">{monthRecords.length}</div>
          </div>
        </div>
        <div className="stat-card card">
          <span className="stat-icon">
            <Icon name="target" size={18} />
          </span>
          <div>
            <div className="stat-label">打卡目标</div>
            <div className="stat-value">{checkins.length}</div>
          </div>
        </div>
        <div className="stat-card card">
          <span className="stat-icon">
            <Icon name="check" size={18} />
          </span>
          <div>
            <div className="stat-label">今日已打卡</div>
            <div className="stat-value">{todayChecked}</div>
          </div>
        </div>
        <div className="stat-card card">
          <span className="stat-icon">
            <Icon name="award" size={18} />
          </span>
          <div>
            <div className="stat-label">已达成目标</div>
            <div className="stat-value">{reachedTarget}</div>
          </div>
        </div>
      </section>

      {checkins.length === 0 ? (
        <section className="card panel">
          <div className="empty-state large">
            <span className="empty-icon">
              <Icon name="flame" size={24} />
            </span>
            <div>
              <strong>还没有打卡目标</strong>
              <p>设置一个每月目标天数，例如每月运动 20 天，然后每天来打卡。</p>
            </div>
            <button
              className="primary-button"
              onClick={() => setEditor({})}
            >
              <Icon name="plus" size={16} />
              新建第一个目标
            </button>
          </div>
        </section>
      ) : (
        <div className="checkin-grid">
          {checkins.map((checkin) => {
            const records = checkinRecords.filter(
              (record) => record.checkinId === checkin.id
            )
            const dates = new Set(records.map((record) => record.date))
            const count = countInPeriod(
              records,
              checkin.id,
              checkin.period,
              referenceDate
            )
            const percent = Math.min(
              100,
              Math.round((count / Math.max(1, checkin.targetDays)) * 100)
            )
            const streak = currentStreak(checkinRecords, checkin.id)
            const checkedToday = dates.has(today)

            return (
              <article className="card checkin-card" key={checkin.id}>
                <div className="checkin-card-head">
                  <div className="checkin-title">
                    <span
                      className="checkin-dot"
                      style={{ background: checkin.color }}
                    />
                    <div>
                      <strong>{checkin.name}</strong>
                      <span>
                        {PERIOD_LABEL[checkin.period]}目标 · {checkin.targetDays}{' '}
                        {PERIOD_UNIT[checkin.period]}
                      </span>
                    </div>
                  </div>
                  <div className="checkin-card-actions">
                    <button
                      className="icon-button tiny"
                      title="编辑"
                      onClick={() => setEditor({ checkin })}
                    >
                      <Icon name="pen" size={13} />
                    </button>
                    <button
                      className="icon-button tiny"
                      title="删除"
                      onClick={() => removeCheckin(checkin)}
                    >
                      <Icon name="trash" size={13} />
                    </button>
                  </div>
                </div>

                <div className="checkin-progress">
                  <div className="checkin-progress-top">
                    <strong>
                      {count}
                      <span> / {checkin.targetDays} 天</span>
                    </strong>
                    <span>{percent}%</span>
                  </div>
                  <div className="checkin-bar">
                    <div
                      className="checkin-bar-fill"
                      style={{
                        width: `${percent}%`,
                        background: checkin.color
                      }}
                    />
                  </div>
                  <div className="checkin-meta">
                    <span>连续 {streak} 天</span>
                    {count >= checkin.targetDays && (
                      <span className="checkin-reached">
                        <Icon name="check" size={12} />
                        已达成
                      </span>
                    )}
                  </div>
                </div>

                <div className="checkin-calendar">
                  {['一', '二', '三', '四', '五', '六', '日'].map((day) => (
                    <span className="checkin-weekday" key={day}>
                      {day}
                    </span>
                  ))}
                  {cells.map((iso, index) => {
                    if (!iso) {
                      return <span className="checkin-day empty" key={`e-${index}`} />
                    }
                    const isToday = iso === today
                    const checked = dates.has(iso)
                    const future = iso > today
                    return (
                      <button
                        key={iso}
                        className={[
                          'checkin-day',
                          checked ? 'checked' : '',
                          isToday ? 'today' : '',
                          future ? 'future' : ''
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        style={
                          checked
                            ? { background: checkin.color, borderColor: checkin.color }
                            : undefined
                        }
                        disabled={future}
                        title={checked ? `${iso} 已打卡，点击取消` : `${iso} 打卡`}
                        onClick={() => void toggleCheckin(checkin.id, iso)}
                      >
                        {Number(iso.slice(8))}
                      </button>
                    )
                  })}
                </div>

                {checkin.note && (
                  <p className="checkin-note">{checkin.note}</p>
                )}

                <button
                  className={
                    checkedToday ? 'checkin-today checked' : 'checkin-today'
                  }
                  onClick={() => void toggleCheckin(checkin.id, today)}
                >
                  <Icon name={checkedToday ? 'check' : 'flame'} size={16} />
                  {checkedToday ? '今天已打卡，点击取消' : '今天打卡'}
                </button>
              </article>
            )
          })}
        </div>
      )}

      {editor && (
        <CheckinEditorModal
          checkin={editor.checkin}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  )
}
