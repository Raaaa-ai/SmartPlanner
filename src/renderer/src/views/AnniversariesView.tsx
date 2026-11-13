import { useMemo, useState } from 'react'
import type {
  Anniversary,
  AnniversaryCalendar,
  AnniversaryInput,
  AnniversaryRepeat
} from '../../../shared/types'
import {
  LUNAR_DAY_LABELS,
  LUNAR_MONTH_LABELS,
  isValidLunarParts,
  leapMonthOfYear,
  lunarMonthDayCount,
  lunarPartsToSolar,
  parseLunarDate,
  solarToLunarParts
} from '../../../shared/lunar'
import { Icon } from '../components/Icon'
import {
  anniversaryDateLabel,
  countdownFor,
  sortByCountdown
} from '../lib/anniversaries'
import { COLOR_PALETTE } from '../lib/colors'
import { formatDayDate, todayISO } from '../lib/date'
import { useWorkspace } from '../state/WorkspaceContext'

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function AnniversaryModal({
  anniversary,
  onClose
}: {
  anniversary?: Anniversary
  onClose: () => void
}): React.JSX.Element {
  const { createAnniversary, updateAnniversary } = useWorkspace()
  const today = todayISO()
  const initialLunar =
    anniversary?.calendar === 'lunar'
      ? parseLunarDate(anniversary.date, anniversary.lunarLeap)
      : solarToLunarParts(anniversary?.date ?? today)
  const initialSolarDate =
    anniversary?.calendar === 'lunar'
      ? (initialLunar && lunarPartsToSolar(initialLunar)) || today
      : anniversary?.date ?? today
  const fallbackLunar = solarToLunarParts(today)

  const [title, setTitle] = useState(anniversary?.title ?? '')
  const [calendar, setCalendar] = useState<AnniversaryCalendar>(
    anniversary?.calendar ?? 'solar'
  )
  const [solarDate, setSolarDate] = useState(initialSolarDate)
  const [lunarYear, setLunarYear] = useState(
    initialLunar?.year ?? fallbackLunar.year
  )
  const [lunarMonth, setLunarMonth] = useState(
    initialLunar?.month ?? fallbackLunar.month
  )
  const [lunarDay, setLunarDay] = useState(
    initialLunar?.day ?? fallbackLunar.day
  )
  const [lunarLeap, setLunarLeap] = useState(initialLunar?.leap ?? false)
  const [repeat, setRepeat] = useState<AnniversaryRepeat>(
    anniversary?.repeat ?? 'yearly'
  )
  const [note, setNote] = useState(anniversary?.note ?? '')
  const [color, setColor] = useState(anniversary?.color ?? COLOR_PALETTE[0])
  const [saving, setSaving] = useState(false)

  const leapMonth = leapMonthOfYear(lunarYear)
  const canLeap = leapMonth === lunarMonth
  const effectiveLeap = lunarLeap && canLeap
  const dayCount = lunarMonthDayCount(lunarYear, lunarMonth, effectiveLeap)
  const effectiveDay = Math.min(lunarDay, dayCount)
  const lunarParts = {
    year: lunarYear,
    month: lunarMonth,
    day: effectiveDay,
    leap: effectiveLeap
  }
  const validLunar = isValidLunarParts(lunarParts)
  const solarPreview = validLunar ? lunarPartsToSolar(lunarParts) : null

  function switchCalendar(next: AnniversaryCalendar): void {
    if (next === calendar) return

    if (next === 'lunar') {
      const parts = solarToLunarParts(solarDate)
      setLunarYear(parts.year)
      setLunarMonth(parts.month)
      setLunarDay(parts.day)
      setLunarLeap(parts.leap)
    } else {
      const solar = lunarPartsToSolar(lunarParts)
      if (solar) setSolarDate(solar)
    }

    setCalendar(next)
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    if (!title.trim() || saving) return
    if (calendar === 'lunar' && !validLunar) return
    if (calendar === 'solar' && !solarDate) return

    setSaving(true)
    const input: AnniversaryInput = {
      title: title.trim(),
      date:
        calendar === 'lunar'
          ? `${lunarYear}-${pad2(lunarMonth)}-${pad2(effectiveDay)}`
          : solarDate,
      calendar,
      lunarLeap: calendar === 'lunar' ? effectiveLeap : false,
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

          <div className="field">
            <label>日历</label>
            <div className="segmented">
              <button
                type="button"
                className={
                  calendar === 'solar' ? 'segment active' : 'segment'
                }
                onClick={() => switchCalendar('solar')}
              >
                阳历
              </button>
              <button
                type="button"
                className={
                  calendar === 'lunar' ? 'segment active' : 'segment'
                }
                onClick={() => switchCalendar('lunar')}
              >
                阴历
              </button>
            </div>
          </div>

          {calendar === 'solar' ? (
            <div className="field">
              <label htmlFor="anniversary-date">日期</label>
              <input
                id="anniversary-date"
                className="input"
                type="date"
                value={solarDate}
                onChange={(event) => setSolarDate(event.target.value)}
              />
            </div>
          ) : (
            <>
              <div className="row lunar-date-row">
                <div className="field">
                  <label htmlFor="lunar-year">农历年</label>
                  <input
                    id="lunar-year"
                    className="input"
                    type="number"
                    min={1900}
                    max={2100}
                    value={lunarYear}
                    onChange={(event) => {
                      const value = Number(event.target.value)
                      setLunarYear(value)
                      if (leapMonthOfYear(value) !== lunarMonth) {
                        setLunarLeap(false)
                      }
                    }}
                  />
                </div>
                <div className="field">
                  <label htmlFor="lunar-month">农历月</label>
                  <select
                    id="lunar-month"
                    className="select"
                    value={lunarMonth}
                    onChange={(event) => {
                      const value = Number(event.target.value)
                      setLunarMonth(value)
                      if (leapMonthOfYear(lunarYear) !== value) {
                        setLunarLeap(false)
                      }
                    }}
                  >
                    {LUNAR_MONTH_LABELS.map((label, index) => (
                      <option key={label} value={index + 1}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="lunar-day">农历日</label>
                  <select
                    id="lunar-day"
                    className="select"
                    value={effectiveDay}
                    onChange={(event) =>
                      setLunarDay(Number(event.target.value))
                    }
                  >
                    {LUNAR_DAY_LABELS.slice(0, dayCount).map((label, index) => (
                      <option key={label} value={index + 1}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="lunar-options">
                {canLeap && (
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={lunarLeap}
                      onChange={(event) => setLunarLeap(event.target.checked)}
                    />
                    闰{LUNAR_MONTH_LABELS[lunarMonth - 1]}
                  </label>
                )}
                <span className={validLunar ? 'muted' : 'danger-text'}>
                  {validLunar
                    ? `对应阳历 ${solarPreview}`
                    : '该农历日期不存在，请调整年份或月日'}
                </span>
              </div>
            </>
          )}

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

          <div className="field">
            <label>颜色</label>
            <div className="swatches">
              {COLOR_PALETTE.map((item) => (
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
            disabled={
              !title.trim() ||
              saving ||
              (calendar === 'lunar' && !validLunar) ||
              (calendar === 'solar' && !solarDate)
            }
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
            <p>把生日、纪念日和重要节点记下来，支持阳历和阴历。</p>
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
                className={
                  past ? 'anniversary-card card past' : 'anniversary-card card'
                }
                key={item.id}
              >
                <span
                  className="anniversary-stripe"
                  style={{ background: item.color }}
                />
                <div className="anniversary-head">
                  <span className="anniversary-title">{item.title}</span>
                  <div className="anniversary-tags">
                    <span className="anniversary-repeat">
                      {item.calendar === 'lunar' ? '阴历' : '阳历'}
                    </span>
                    <span className="anniversary-repeat">
                      {item.repeat === 'yearly' ? '每年' : '仅一次'}
                    </span>
                  </div>
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
                    {anniversaryDateLabel(item, item.repeat === 'once')}
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
