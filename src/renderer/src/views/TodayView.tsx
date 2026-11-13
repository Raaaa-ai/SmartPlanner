import { useState } from 'react'
import { Icon, type IconName } from '../components/Icon'
import { TaskModal } from '../components/TaskModal'
import { TaskRow } from '../components/TaskRow'
import {
  anniversaryDateLabel,
  countdownFor,
  sortByCountdown
} from '../lib/anniversaries'
import {
  formatFullDate,
  formatTime,
  todayISO,
  tomorrowISO
} from '../lib/date'
import { todayTasks, tomorrowTasks } from '../lib/tasks'
import { useWorkspace } from '../state/WorkspaceContext'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早上好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

export function TodayView(): React.JSX.Element {
  const {
    projects,
    progress,
    tasks,
    captures,
    anniversaries,
    courses,
    checkins,
    checkinRecords,
    createTask,
    deleteCapture,
    toggleCheckin
  } = useWorkspace()
  const today = todayISO()
  const upcomingAnniversaries = sortByCountdown(anniversaries, today).slice(0, 3)

  const todaysTasks = todayTasks(tasks, today)
  const tomorrowsTasks = tomorrowTasks(tasks)
  const todaysProgress = progress
    .filter((entry) => entry.date === today)
    .sort((a, b) => b.createdAt - a.createdAt)
  const activeProjects = projects.filter((project) => project.status === 'active')
  const projectById = new Map(projects.map((project) => [project.id, project]))

  const weekday = new Date().getDay() === 0 ? 7 : new Date().getDay()
  const todaysCourses = courses
    .filter((course) => course.weekday === weekday)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
  const todaysCheckins = [...checkins].sort((a, b) => a.createdAt - b.createdAt)
  const checkedToday = new Set(
    checkinRecords
      .filter((record) => record.date === today)
      .map((record) => record.checkinId)
  )
  const checkinPeriodLabel: Record<string, string> = {
    week: '本周',
    month: '本月',
    year: '今年'
  }

  const [newTask, setNewTask] = useState('')
  const [tomorrowModal, setTomorrowModal] = useState(false)

  async function addQuickTask(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    if (!newTask.trim()) return
    const task = await createTask({
      title: newTask.trim(),
      dueDate: today,
      priority: 'normal'
    })
    if (task) setNewTask('')
  }

  const stats: { label: string; value: number; icon: IconName }[] = [
    { label: '进行中项目', value: activeProjects.length, icon: 'folder' },
    { label: '今日待办', value: todaysTasks.length, icon: 'tasks' },
    { label: '明日待办', value: tomorrowsTasks.length, icon: 'clock' },
    { label: '今日进展', value: todaysProgress.length, icon: 'target' }
  ]

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="hero-greeting">{greeting()}</p>
          <h2 className="hero-date">{formatFullDate(today)}</h2>
          <p className="hero-sub">
            今天想先完成哪件事？按 Ctrl + Alt + Space 随时记下来。
          </p>
        </div>
        <button className="primary-button" onClick={() => window.api.openQuickCapture()}>
          <Icon name="plus" size={16} />
          记一条
        </button>
      </section>

      <section className="stats-grid">
        {stats.map((stat) => (
          <div className="stat-card card" key={stat.label}>
            <span className="stat-icon">
              <Icon name={stat.icon} size={18} />
            </span>
            <div>
              <div className="stat-label">{stat.label}</div>
              <div className="stat-value">{stat.value}</div>
            </div>
          </div>
        ))}
      </section>

      <div className="two-columns today-columns">
        <div className="stack">
          <section className="card panel">
            <div className="panel-head">
              <h3>今日待办</h3>
              <span className="muted">{todaysTasks.length} 条</span>
            </div>

            <form className="inline-add" onSubmit={addQuickTask}>
              <input
                className="input"
                value={newTask}
                onChange={(event) => setNewTask(event.target.value)}
                placeholder="添加今天要完成的事…"
              />
              <button
                className="icon-button add"
                type="submit"
                disabled={!newTask.trim()}
                title="添加待办"
              >
                <Icon name="plus" size={16} />
              </button>
            </form>

            {todaysTasks.length === 0 ? (
              <div className="empty-state compact">
                <span className="empty-icon">
                  <Icon name="tasks" size={22} />
                </span>
                <div>
                  <strong>今天没有待办</strong>
                  <p>在上方添加一条，或去「待办」页安排更多事情。</p>
                </div>
              </div>
            ) : (
              <ul className="task-list compact">
                {todaysTasks.map((task) => (
                  <TaskRow key={task.id} task={task} compact />
                ))}
              </ul>
            )}
          </section>

          <section className="card panel">
            <div className="panel-head">
              <h3>明日待办</h3>
              <div className="panel-head-actions">
                <span className="muted">{tomorrowsTasks.length} 条</span>
                <button
                  className="ghost-button"
                  onClick={() => setTomorrowModal(true)}
                >
                  <Icon name="plus" size={15} />
                  添加
                </button>
              </div>
            </div>
            {tomorrowsTasks.length === 0 ? (
              <div className="empty-state compact">
                <span className="empty-icon">
                  <Icon name="clock" size={22} />
                </span>
                <div>
                  <strong>明天还没有安排</strong>
                  <p>提前把明天要做的事安排好，时间地点都能记下来。</p>
                </div>
              </div>
            ) : (
              <ul className="task-list compact">
                {tomorrowsTasks.map((task) => (
                  <TaskRow key={task.id} task={task} compact />
                ))}
              </ul>
            )}
          </section>

          <section className="card panel">
            <div className="panel-head">
              <h3>今日项目进展</h3>
              <span className="muted">{todaysProgress.length} 条</span>
            </div>
            {todaysProgress.length === 0 ? (
              <div className="empty-state compact">
                <span className="empty-icon">
                  <Icon name="target" size={22} />
                </span>
                <div>
                  <strong>今天还没有进展记录</strong>
                  <p>去「项目」里为今天写一条进展，它会自动出现在月历中。</p>
                </div>
              </div>
            ) : (
              <ul className="feed">
                {todaysProgress.map((entry) => {
                  const project = projectById.get(entry.projectId)
                  return (
                    <li key={entry.id} className="feed-item">
                      <span
                        className="feed-dot"
                        style={{ background: project?.color ?? 'var(--accent)' }}
                      />
                      <div className="feed-body">
                        <div className="feed-title">{project?.name ?? '未知项目'}</div>
                        <div className="feed-text">{entry.content}</div>
                      </div>
                      <span className="percent-badge">{entry.percent}%</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>

        <div className="stack">
        <section className="card panel">
          <div className="panel-head">
            <h3>今日课表</h3>
            <span className="muted">{todaysCourses.length} 节</span>
          </div>
          {todaysCourses.length === 0 ? (
            <div className="empty-state compact">
              <span className="empty-icon">
                <Icon name="book" size={22} />
              </span>
              <div>
                <strong>今天没有课程</strong>
                <p>可以去「课程表」安排本周的课程。</p>
              </div>
            </div>
          ) : (
            <ul className="feed">
              {todaysCourses.map((course) => (
                <li key={course.id} className="feed-item">
                  <span
                    className="feed-dot"
                    style={{ background: course.color }}
                  />
                  <div className="feed-body">
                    <div className="feed-title">{course.name}</div>
                    <div className="feed-text">
                      {course.startTime} - {course.endTime}
                      {course.location ? ` · ${course.location}` : ''}
                    </div>
                  </div>
                  {course.weeks && (
                    <span className="percent-badge">{course.weeks}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card panel">
          <div className="panel-head">
            <h3>今日打卡</h3>
            <span className="muted">
              {checkedToday.size}/{todaysCheckins.length} 已完成
            </span>
          </div>
          {todaysCheckins.length === 0 ? (
            <div className="empty-state compact">
              <span className="empty-icon">
                <Icon name="flame" size={22} />
              </span>
              <div>
                <strong>还没有打卡目标</strong>
                <p>去「打卡」设置目标，每天来打卡。</p>
              </div>
            </div>
          ) : (
            <ul className="feed">
              {todaysCheckins.map((item) => {
                const done = checkedToday.has(item.id)
                return (
                  <li key={item.id} className="feed-item">
                    <span
                      className="feed-dot"
                      style={{ background: item.color }}
                    />
                    <div className="feed-body">
                      <div className="feed-title">{item.name}</div>
                      <div className="feed-text">
                        {done
                          ? '今天已打卡'
                          : `${checkinPeriodLabel[item.period]}目标 ${item.targetDays} 天`}
                      </div>
                    </div>
                    <button
                      className={
                        done
                          ? 'today-checkin-button done'
                          : 'today-checkin-button'
                      }
                      onClick={() => void toggleCheckin(item.id, today)}
                    >
                      <Icon name={done ? 'check' : 'flame'} size={14} />
                      {done ? '已打卡' : '打卡'}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="card panel">
          <div className="panel-head">
            <h3>最近速记</h3>
            <span className="muted">{captures.length} 条</span>
          </div>
          {captures.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">
                <Icon name="spark" size={22} />
              </span>
              <div>
                <strong>还没有速记</strong>
                <p>按 Ctrl + Alt + Space 随手记下想法、待办或灵感。</p>
              </div>
            </div>
          ) : (
            <ul className="feed">
              {captures.slice(0, 8).map((item) => (
                <li key={item.id} className="feed-item">
                  <span className="feed-dot" />
                  <div className="feed-body">
                    <div className="feed-text">{item.text}</div>
                  </div>
                  <span className="feed-time">{formatTime(item.createdAt)}</span>
                  <button
                    className="icon-button tiny"
                    title="删除速记"
                    onClick={() => {
                      if (!window.confirm('确定删除这条速记吗？')) return
                      void deleteCapture(item.id)
                    }}
                  >
                    <Icon name="trash" size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card panel">
          <div className="panel-head">
            <h3>即将到来的纪念日</h3>
            <span className="muted">{anniversaries.length} 个</span>
          </div>
          {upcomingAnniversaries.length === 0 ? (
            <div className="empty-state compact">
              <span className="empty-icon">
                <Icon name="gift" size={22} />
              </span>
              <div>
                <strong>还没有纪念日</strong>
                <p>去「纪念日」记下重要的日子，这里会显示最近的倒数。</p>
              </div>
            </div>
          ) : (
            <ul className="feed">
              {upcomingAnniversaries.map((item) => {
                const countdown = countdownFor(item, today)
                return (
                  <li key={item.id} className="feed-item">
                    <span
                      className="feed-dot"
                      style={{ background: item.color }}
                    />
                    <div className="feed-body">
                      <div className="feed-title">{item.title}</div>
                      <div className="feed-text">
                        {anniversaryDateLabel(item)}
                      </div>
                    </div>
                    <span className="percent-badge">{countdown.label}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
        </div>
      </div>

      {tomorrowModal && (
        <TaskModal
          defaultDate={tomorrowISO()}
          onClose={() => setTomorrowModal(false)}
        />
      )}
    </>
  )
}
