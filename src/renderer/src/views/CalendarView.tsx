import { useEffect, useMemo, useState } from 'react'
import type { ProgressEntry, RecordCard } from '../../../shared/types'
import { Icon } from '../components/Icon'
import { TaskCheckbox } from '../components/TaskCheckbox'
import {
  formatDayDate,
  formatMonthTitle,
  monthCells,
  todayISO,
  toISODate
} from '../lib/date'
import { moodLabel } from '../lib/moods'
import { PRIORITY_LABEL } from '../lib/tasks'
import { useWorkspace } from '../state/WorkspaceContext'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

function sortEntries(entries: ProgressEntry[]): ProgressEntry[] {
  return [...entries].sort((a, b) =>
    a.date === b.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date)
  )
}

export function CalendarView(): React.JSX.Element {
  const {
    projects,
    progress,
    tasks,
    recordCards,
    reflections,
    addProgress,
    updateTask
  } = useWorkspace()
  const today = todayISO()

  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState(today)
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '')
  const [content, setContent] = useState('')
  const [percent, setPercent] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!projects.some((project) => project.id === projectId)) {
      setProjectId(projects[0]?.id ?? '')
    }
  }, [projects, projectId])

  const cells = useMemo(
    () => monthCells(cursor.getFullYear(), cursor.getMonth()),
    [cursor]
  )

  const projectById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects]
  )

  const byDate = useMemo(() => {
    const map = new Map<string, ProgressEntry[]>()
    for (const entry of progress) {
      const list = map.get(entry.date)
      if (list) list.push(entry)
      else map.set(entry.date, [entry])
    }
    for (const list of map.values()) {
      list.sort((a, b) => b.createdAt - a.createdAt)
    }
    return map
  }, [progress])

  const recordsByDate = useMemo(() => {
    const map = new Map<string, RecordCard[]>()
    for (const card of recordCards) {
      const list = map.get(card.date)
      if (list) list.push(card)
      else map.set(card.date, [card])
    }
    for (const list of map.values()) {
      list.sort((a, b) => b.createdAt - a.createdAt)
    }
    return map
  }, [recordCards])

  const reflectionByDate = useMemo(
    () => new Map(reflections.map((item) => [item.date, item])),
    [reflections]
  )

  const tasksByDate = useMemo(() => {
    const map = new Map<string, typeof tasks>()
    for (const task of tasks) {
      if (!task.dueDate) continue
      const list = map.get(task.dueDate)
      if (list) list.push(task)
      else map.set(task.dueDate, [task])
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.dueTime || '99:99').localeCompare(b.dueTime || '99:99'))
    }
    return map
  }, [tasks])

  const selectedEntries = byDate.get(selectedDate) ?? []
  const selectedTasks = tasksByDate.get(selectedDate) ?? []
  const selectedRecords = recordsByDate.get(selectedDate) ?? []
  const selectedReflection = reflectionByDate.get(selectedDate)

  function changeMonth(delta: number): void {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1))
  }

  function goToday(): void {
    const now = new Date()
    setCursor(new Date(now.getFullYear(), now.getMonth(), 1))
    setSelectedDate(today)
  }

  function chooseProject(id: string): void {
    setProjectId(id)
    const latest = sortEntries(progress.filter((entry) => entry.projectId === id))[0]
    setPercent(latest?.percent ?? 0)
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    if (!projectId || !content.trim() || saving) return

    setSaving(true)
    const entry = await addProgress({
      projectId,
      date: selectedDate,
      content: content.trim(),
      percent
    })
    setSaving(false)
    if (entry) setContent('')
  }

  return (
    <div className="calendar-layout">
      <section className="card calendar-card">
        <div className="calendar-toolbar">
          <div className="calendar-title-group">
            <button
              className="icon-button"
              onClick={() => changeMonth(-1)}
              title="上个月"
            >
              <Icon name="chevron-left" size={16} />
            </button>
            <h2 className="calendar-title">
              {formatMonthTitle(cursor.getFullYear(), cursor.getMonth())}
            </h2>
            <button
              className="icon-button"
              onClick={() => changeMonth(1)}
              title="下个月"
            >
              <Icon name="chevron-right" size={16} />
            </button>
          </div>
          <button className="ghost-button" onClick={goToday}>
            回到今天
          </button>
        </div>

        <div className="calendar-legend">
          <span><i className="legend-dot tasks" />待办</span>
          <span><i className="legend-dot progress" />项目</span>
          <span><i className="legend-dot records" />记录</span>
          <span><i className="legend-dot reflection" />感想</span>
        </div>

        <div className="calendar-grid">
          {WEEKDAYS.map((day) => (
            <div className="weekday" key={day}>
              {day}
            </div>
          ))}

          {cells.map((date) => {
            const iso = toISODate(date)
            const inMonth = date.getMonth() === cursor.getMonth()
            const entries = byDate.get(iso) ?? []
            const dayTasks = tasksByDate.get(iso) ?? []
            const recordCount = recordsByDate.get(iso)?.length ?? 0
            const hasReflection = reflectionByDate.has(iso)
            const indicators: { key: string; color: string; title: string }[] = []

            if (dayTasks.length > 0) {
              indicators.push({
                key: 'tasks',
                color: 'var(--accent)',
                title: `${dayTasks.length} 条待办 / 计划`
              })
            }
            if (entries.length > 0) {
              indicators.push({
                key: 'progress',
                color: '#64748b',
                title: `${entries.length} 条项目进展`
              })
            }
            if (recordCount > 0) {
              indicators.push({
                key: 'records',
                color: '#a64b2a',
                title: `${recordCount} 张记录卡`
              })
            }
            if (hasReflection) {
              indicators.push({
                key: 'reflection',
                color: '#8a6f8f',
                title: '有每日感想'
              })
            }

            const classes = ['day']
            if (!inMonth) classes.push('other')
            if (iso === today) classes.push('today')
            if (iso === selectedDate) classes.push('selected')

            return (
              <button
                className={classes.join(' ')}
                key={iso}
                onClick={() => setSelectedDate(iso)}
              >
                <span className="day-number">{date.getDate()}</span>
                {indicators.length > 0 && (
                  <span className="day-indicators">
                    {indicators.map((item) => (
                      <span
                        className="day-indicator"
                        key={item.key}
                        style={{ background: item.color }}
                        title={item.title}
                      />
                    ))}
                  </span>
                )}
              </button>
            )
          })}
        </div>

      </section>

      <aside className="card day-panel">
        <div>
          <h3 className="day-panel-date">{formatDayDate(selectedDate)}</h3>
          <p className="page-sub">
            {selectedTasks.length +
              selectedEntries.length +
              selectedRecords.length ===
              0 && !selectedReflection
              ? '这一天还没有记录'
              : [
                  selectedTasks.length > 0
                    ? `${selectedTasks.length} 待办`
                    : '',
                  selectedEntries.length > 0
                    ? `${selectedEntries.length} 进展`
                    : '',
                  selectedRecords.length > 0
                    ? `${selectedRecords.length} 记录卡`
                    : '',
                  selectedReflection ? '有感想' : ''
                ]
                  .filter(Boolean)
                  .join(' · ')}
          </p>
        </div>

        {selectedTasks.length > 0 && (
          <>
            <div className="panel-head tight">
              <h3>待办与计划</h3>
              <span className="muted">{selectedTasks.length} 条</span>
            </div>
            <ul className="day-task-list">
              {selectedTasks.map((task) => (
                <li
                  className={task.done ? 'day-task done' : 'day-task'}
                  key={task.id}
                >
                  <TaskCheckbox
                    done={task.done}
                    onChange={() =>
                      void updateTask(task.id, { done: !task.done })
                    }
                  />
                  <div className="day-task-body">
                    <div className="day-task-title">{task.title}</div>
                    <div className="day-task-meta">
                      {task.dueTime && (
                        <span>
                          <Icon name="clock" size={12} />
                          {task.dueTime}
                        </span>
                      )}
                      {task.location && (
                        <span>
                          <Icon name="location" size={12} />
                          {task.location}
                        </span>
                      )}
                      <span
                        className={`priority-badge priority-${task.priority}`}
                      >
                        {PRIORITY_LABEL[task.priority]}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="divider" />
          </>
        )}

        {selectedEntries.length > 0 && (
          <>
            <div className="panel-head tight">
              <h3>项目进展</h3>
              <span className="muted">{selectedEntries.length} 条</span>
            </div>
            <div className="day-entries">
              {selectedEntries.map((entry) => {
              const project = projectById.get(entry.projectId)
              return (
                <div className="entry" key={entry.id}>
                  <span
                    className="entry-bar"
                    style={{ background: project?.color ?? 'var(--accent)' }}
                  />
                  <div className="entry-body">
                    <div className="entry-project" style={{ color: project?.color }}>
                      {project?.name ?? '未知项目'}
                    </div>
                    <div className="entry-content">{entry.content}</div>
                    <div className="entry-meta">进度 {entry.percent}%</div>
                  </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {selectedRecords.length > 0 && (
          <>
            <div className="divider" />
            <div className="panel-head tight">
              <h3>记录卡</h3>
              <span className="muted">{selectedRecords.length} 张</span>
            </div>
            <div className="day-records">
              {selectedRecords.map((card) => (
                <div className="day-record" key={card.id}>
                  <span
                    className="day-record-dot"
                    style={{ background: card.color }}
                  />
                  <div className="day-record-body">
                    <div className="day-record-head">
                      <span className="day-record-category" style={{ color: card.color }}>
                        {card.category}
                      </span>
                      <span className="day-record-title">{card.title}</span>
                    </div>
                    {card.description && (
                      <p className="day-record-desc">{card.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {selectedReflection && (
          <>
            <div className="divider" />
            <div className="panel-head tight">
              <h3>每日感想</h3>
              {selectedReflection.mood && (
                <span className="mood-badge">
                  {moodLabel(selectedReflection.mood)}
                </span>
              )}
            </div>
            <p className="day-reflection">
              {selectedReflection.content.trim() || '（只记录了心情）'}
            </p>
          </>
        )}

        <div className="divider" />

        <div className="panel-head tight">
          <h3>添加当天进展</h3>
        </div>

        {projects.length === 0 ? (
          <p className="hint">请先在「项目」中创建一个项目。</p>
        ) : (
          <form className="form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="calendar-project">项目</label>
              <select
                id="calendar-project"
                className="select"
                value={projectId}
                onChange={(event) => chooseProject(event.target.value)}
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="calendar-content">进展</label>
              <textarea
                id="calendar-content"
                className="textarea"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="今天推进了什么？"
              />
            </div>

            <div className="field">
              <label>整体进度：{percent}%</label>
              <input
                className="range full"
                type="range"
                min={0}
                max={100}
                step={5}
                value={percent}
                onChange={(event) => setPercent(Number(event.target.value))}
              />
            </div>

            <button
              className="primary-button"
              type="submit"
              disabled={!content.trim() || saving}
            >
              <Icon name="plus" size={15} />
              {saving ? '保存中…' : '添加到这一天'}
            </button>
          </form>
        )}
      </aside>
    </div>
  )
}
