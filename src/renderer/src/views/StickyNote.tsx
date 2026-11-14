import { useMemo, useState } from 'react'
import type { StickyModule } from '../../../shared/types'
import { Icon, type IconName } from '../components/Icon'
import { TaskCheckbox } from '../components/TaskCheckbox'
import { formatDayDate, todayISO } from '../lib/date'
import { dueText, sortOpenTasks } from '../lib/tasks'
import { useWorkspace } from '../state/WorkspaceContext'

const MODULE_META: Record<
  StickyModule,
  { label: string; icon: IconName; empty: string }
> = {
  tasks: { label: '待办', icon: 'tasks', empty: '今天没有待办' },
  projects: { label: '项目', icon: 'folder', empty: '还没有进行中的项目' },
  checkin: { label: '打卡', icon: 'flame', empty: '还没有打卡目标' },
  courses: { label: '课程', icon: 'book', empty: '今天没有课程' }
}

const PERIOD_LABEL: Record<string, string> = {
  week: '本周',
  month: '本月',
  year: '今年'
}

function weekdayNumber(): number {
  const day = new Date().getDay()
  return day === 0 ? 7 : day
}

export function StickyNote(): React.JSX.Element {
  const {
    settings,
    tasks,
    projects,
    progress,
    checkins,
    checkinRecords,
    courses,
    updateTask,
    toggleCheckin
  } = useWorkspace()
  const [active, setActive] = useState<StickyModule>('tasks')
  const today = todayISO()
  const weekday = weekdayNumber()

  const modules = settings.stickyModules
  const activeModule = modules.includes(active) ? active : modules[0]

  const openTasks = useMemo(
    () => sortOpenTasks(tasks.filter((task) => !task.done)).slice(0, 8),
    [tasks]
  )

  const activeProjects = useMemo(() => {
    return projects
      .filter((project) => project.status === 'active')
      .slice(0, 6)
      .map((project) => {
        const entries = progress
          .filter((entry) => entry.projectId === project.id)
          .sort((a, b) => b.createdAt - a.createdAt)
        const latest = entries[0]
        return {
          project,
          percent: latest?.percent ?? 0,
          latest: latest?.content ?? ''
        }
      })
  }, [projects, progress])

  const checkedToday = useMemo(
    () =>
      new Set(
        checkinRecords
          .filter((record) => record.date === today)
          .map((record) => record.checkinId)
      ),
    [checkinRecords, today]
  )

  const todaySlots = useMemo(() => {
    return courses
      .flatMap((course) =>
        course.slots
          .filter((slot) => slot.weekday === weekday)
          .map((slot) => ({ course, slot }))
      )
      .sort((a, b) => a.slot.startTime.localeCompare(b.slot.startTime))
      .slice(0, 8)
  }, [courses, weekday])

  return (
    <div className="sticky-shell">
      <div className="sticky-grabber" />
      <header className="sticky-header">
        <button
          type="button"
          className="sticky-brand"
          title="打开 SmartPlanner"
          onClick={() => window.api.openMain()}
        >
          <span className="sticky-logo">S</span>
          <span className="sticky-brand-copy">
            <strong>今日便签</strong>
            <span>{formatDayDate(today)}</span>
          </span>
        </button>
        <div className="sticky-header-actions">
          <button
            type="button"
            className="sticky-icon"
            title="打开工作台"
            onClick={() => window.api.openMain()}
          >
            <Icon name="maximize" size={13} />
          </button>
          <button
            type="button"
            className="sticky-icon close"
            title="关闭便签"
            onClick={() => window.api.closeSticky()}
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      </header>

      {modules.length === 0 ? (
        <div className="sticky-empty tall">
          <span className="sticky-empty-icon">
            <Icon name="pin" size={22} />
          </span>
          <strong>便签还没有内容</strong>
          <p>在「设置 → 桌面便签」中选择要显示的模块。</p>
          <button
            type="button"
            className="sticky-primary"
            onClick={() => window.api.openMain()}
          >
            打开工作台
          </button>
        </div>
      ) : (
        <>
          <nav className="sticky-tabs">
            {modules.map((module) => {
              const meta = MODULE_META[module]
              return (
                <button
                  key={module}
                  type="button"
                  className={
                    module === activeModule ? 'sticky-tab active' : 'sticky-tab'
                  }
                  onClick={() => setActive(module)}
                >
                  <Icon name={meta.icon} size={14} />
                  <span>{meta.label}</span>
                </button>
              )
            })}
          </nav>

          <main className="sticky-body">
            {activeModule === 'tasks' && (
              <section className="sticky-list">
                <div className="sticky-section-head">
                  <span>待办</span>
                  <span>{openTasks.length}</span>
                </div>
                {openTasks.length === 0 ? (
                  <div className="sticky-empty">
                    <span className="sticky-empty-icon">
                      <Icon name="check" size={20} />
                    </span>
                    <strong>{MODULE_META.tasks.empty}</strong>
                    <p>去主界面添加新的待办。</p>
                  </div>
                ) : (
                  openTasks.map((task) => (
                    <div className="sticky-task" key={task.id}>
                      <TaskCheckbox
                        done={task.done}
                        onChange={() =>
                          void updateTask(task.id, { done: !task.done })
                        }
                      />
                      <div className="sticky-task-copy">
                        <span className="sticky-task-title">{task.title}</span>
                        <span className="sticky-task-meta">
                          <span
                            className={
                              task.dueDate && task.dueDate < today
                                ? 'sticky-due overdue'
                                : 'sticky-due'
                            }
                          >
                            {dueText(task, today)}
                          </span>
                          {task.projectId && (
                            <span className="sticky-project-dot">
                              {projects.find(
                                (project) => project.id === task.projectId
                              )?.name ?? '项目'}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </section>
            )}

            {activeModule === 'projects' && (
              <section className="sticky-list">
                <div className="sticky-section-head">
                  <span>进行中项目</span>
                  <span>{activeProjects.length}</span>
                </div>
                {activeProjects.length === 0 ? (
                  <div className="sticky-empty">
                    <span className="sticky-empty-icon">
                      <Icon name="folder" size={20} />
                    </span>
                    <strong>{MODULE_META.projects.empty}</strong>
                    <p>去主界面创建或恢复一个项目。</p>
                  </div>
                ) : (
                  activeProjects.map(({ project, percent, latest }) => (
                    <div className="sticky-project" key={project.id}>
                      <div className="sticky-project-head">
                        <span
                          className="sticky-project-color"
                          style={{ background: project.color }}
                        />
                        <span className="sticky-project-name">
                          {project.name}
                        </span>
                        <span className="sticky-project-percent">
                          {percent}%
                        </span>
                      </div>
                      <div className="sticky-progress">
                        <span
                          style={{
                            width: `${percent}%`,
                            background: project.color
                          }}
                        />
                      </div>
                      {latest && (
                        <p className="sticky-project-latest">{latest}</p>
                      )}
                    </div>
                  ))
                )}
              </section>
            )}

            {activeModule === 'checkin' && (
              <section className="sticky-list">
                <div className="sticky-section-head">
                  <span>今日打卡</span>
                  <span>
                    {checkedToday.size}/{checkins.length}
                  </span>
                </div>
                {checkins.length === 0 ? (
                  <div className="sticky-empty">
                    <span className="sticky-empty-icon">
                      <Icon name="flame" size={20} />
                    </span>
                    <strong>{MODULE_META.checkin.empty}</strong>
                    <p>去主界面设置一个目标。</p>
                  </div>
                ) : (
                  checkins.map((item) => {
                    const done = checkedToday.has(item.id)
                    return (
                      <div className="sticky-checkin" key={item.id}>
                        <span
                          className="sticky-project-color"
                          style={{ background: item.color }}
                        />
                        <div className="sticky-checkin-copy">
                          <span className="sticky-task-title">{item.name}</span>
                          <span className="sticky-task-meta">
                            {PERIOD_LABEL[item.period] ?? '本月'}目标{' '}
                            {item.targetDays} 天
                          </span>
                        </div>
                        <button
                          type="button"
                          className={
                            done
                              ? 'sticky-checkin-button done'
                              : 'sticky-checkin-button'
                          }
                          onClick={() => void toggleCheckin(item.id, today)}
                        >
                          <Icon name={done ? 'check' : 'flame'} size={13} />
                          {done ? '已打卡' : '打卡'}
                        </button>
                      </div>
                    )
                  })
                )}
              </section>
            )}

            {activeModule === 'courses' && (
              <section className="sticky-list">
                <div className="sticky-section-head">
                  <span>今日课程</span>
                  <span>{todaySlots.length}</span>
                </div>
                {todaySlots.length === 0 ? (
                  <div className="sticky-empty">
                    <span className="sticky-empty-icon">
                      <Icon name="book" size={20} />
                    </span>
                    <strong>{MODULE_META.courses.empty}</strong>
                    <p>去「课程表」安排本周课程。</p>
                  </div>
                ) : (
                  todaySlots.map(({ course, slot }, index) => (
                    <div
                      className="sticky-course"
                      key={`${course.id}-${index}`}
                    >
                      <span
                        className="sticky-course-stripe"
                        style={{ background: course.color }}
                      />
                      <div className="sticky-course-time">
                        <strong>{slot.startTime}</strong>
                        <span>{slot.endTime}</span>
                      </div>
                      <div className="sticky-course-copy">
                        <span className="sticky-task-title">{course.name}</span>
                        <span className="sticky-task-meta">
                          {course.location || course.teacher || '课程'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </section>
            )}
          </main>
        </>
      )}

      <footer className="sticky-footer">
        <span className="sticky-live-dot" />
        <span>本地保存 · 与工作台同步 · 始终置顶</span>
      </footer>
    </div>
  )
}
