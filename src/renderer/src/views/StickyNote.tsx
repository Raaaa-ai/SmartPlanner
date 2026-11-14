import { useEffect, useMemo, useState } from 'react'
import type {
  Checkin,
  Project,
  StickyEditorType,
  StickyModule,
  StickyStatus,
  Task
} from '../../../shared/types'
import { Icon, type IconName } from '../components/Icon'
import { TaskCheckbox } from '../components/TaskCheckbox'
import { formatDayDate, parseISODate, todayISO } from '../lib/date'
import { sortOpenTasks } from '../lib/tasks'
import { useWorkspace } from '../state/WorkspaceContext'

const MODULE_META: Record<
  StickyModule,
  { label: string; icon: IconName; empty: string; hint: string }
> = {
  tasks: {
    label: '待办',
    icon: 'tasks',
    empty: '今天没有待办',
    hint: '点“新增待办”打开完整编辑窗口'
  },
  projects: {
    label: '项目',
    icon: 'folder',
    empty: '还没有进行中的项目',
    hint: '点“新增项目”打开完整编辑窗口'
  },
  checkin: {
    label: '打卡',
    icon: 'flame',
    empty: '还没有打卡目标',
    hint: '点“新增打卡”打开完整编辑窗口'
  },
  courses: {
    label: '课程',
    icon: 'book',
    empty: '今天没有课程',
    hint: '点“新增课程”打开完整编辑窗口'
  }
}

const EDITOR_TYPE: Record<StickyModule, StickyEditorType> = {
  tasks: 'task',
  projects: 'project',
  checkin: 'checkin',
  courses: 'course'
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

function taskBadge(task: Task, today: string): string {
  if (!task.dueDate) return '无日期'
  if (task.dueDate < today) return '已逾期'
  if (task.dueDate === today) return task.dueTime || '今天'
  const days = Math.round(
    (parseISODate(task.dueDate).getTime() - parseISODate(today).getTime()) /
      86400000
  )
  if (days === 1) return '明天'
  return `剩余 ${Math.max(1, days)} 天`
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
    deleteTask,
    deleteProject,
    addProgress,
    deleteCheckin,
    toggleCheckin,
    deleteCourse
  } = useWorkspace()
  const [active, setActive] = useState<StickyModule>('tasks')
  const [stickyStatus, setStickyStatus] = useState<StickyStatus>({
    mode: 'fallback'
  })
  const today = todayISO()
  const weekday = weekdayNumber()

  useEffect(() => {
    void window.api.getStickyStatus().then(setStickyStatus)
    return window.api.onStickyStatus(setStickyStatus)
  }, [])

  const modules = settings.stickyModules
  const activeModule = modules.includes(active) ? active : modules[0]

  const openTasks = useMemo(
    () => sortOpenTasks(tasks.filter((task) => !task.done)).slice(0, 12),
    [tasks]
  )

  const activeProjects = useMemo(() => {
    return projects
      .filter((project) => project.status === 'active')
      .slice(0, 8)
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
      .slice(0, 10)
  }, [courses, weekday])

  const counts: Record<StickyModule, number> = {
    tasks: openTasks.length,
    projects: activeProjects.length,
    checkin: checkins.length,
    courses: todaySlots.length
  }

  function openEditor(type: StickyEditorType, id?: string): void {
    window.api.focusSticky()
    window.api.openEditor(type, id)
  }

  function addCurrent(): void {
    if (!activeModule) return
    openEditor(EDITOR_TYPE[activeModule])
  }

  function openMain(): void {
    window.api.openMain()
  }

  async function retryDesktop(): Promise<void> {
    const next = await window.api.retryStickyDesktop()
    setStickyStatus(next)
  }

  function removeTask(task: Task): void {
    if (!window.confirm(`确定删除待办「${task.title}」吗？`)) return
    void deleteTask(task.id)
  }

  function removeProject(project: Project): void {
    if (!window.confirm(`确定删除项目「${project.name}」吗？`)) return
    void deleteProject(project.id)
  }

  function removeCheckin(checkin: Checkin): void {
    if (!window.confirm(`确定删除打卡「${checkin.name}」吗？`)) return
    void deleteCheckin(checkin.id)
  }

  function removeCourse(course: { id: string; name: string }): void {
    if (!window.confirm(`确定删除课程「${course.name}」吗？`)) return
    void deleteCourse(course.id)
  }

  async function addProjectProgress(
    project: Project,
    currentPercent: number
  ): Promise<void> {
    const content = window.prompt(`记录「${project.name}」的进展`)
    if (!content?.trim()) return
    const percentInput = window.prompt(
      '整体进度（0-100）',
      String(currentPercent)
    )
    if (percentInput === null) return
    const percent = Math.max(
      0,
      Math.min(100, Number(percentInput) || currentPercent)
    )
    await addProgress({
      projectId: project.id,
      date: today,
      content: content.trim(),
      percent
    })
  }

  return (
    <div className="sticky-shell" onPointerDown={() => window.api.focusSticky()}>
      <header
        className="sticky-header"
        onPointerDown={(event) => {
          if (event.button !== 0) return
          if ((event.target as HTMLElement).closest('button')) return
          window.api.focusSticky()
          window.api.startStickyDrag()
        }}
        onPointerUp={() => window.api.endStickyDrag()}
        onPointerCancel={() => window.api.endStickyDrag()}
      >
        <div className="sticky-grabber" />
        <div className="sticky-brand">
          <span className="sticky-logo">S</span>
          <span className="sticky-brand-copy">
            <strong>SmartPlanner</strong>
            <span>{formatDayDate(today)}</span>
          </span>
        </div>
        <div className="sticky-header-actions">
          <button
            type="button"
            className="sticky-icon"
            title="打开工作台"
            onClick={openMain}
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

      <div className="sticky-summary">
        <span className="sticky-avatar">{new Date().getDate()}</span>
        <div className="sticky-summary-copy">
          <strong>今日便签</strong>
          <span>{formatDayDate(today)}</span>
        </div>
        <div className="sticky-summary-stats">
          <span>{openTasks.length} 待办</span>
          <span>{todaySlots.length} 节课</span>
        </div>
      </div>

      <button
        type="button"
        className={
          stickyStatus.mode === 'desktop'
            ? 'sticky-desktop-chip ok'
            : 'sticky-desktop-chip warn'
        }
        title={
          stickyStatus.mode === 'desktop'
            ? '便签已固定在桌面'
            : '桌面挂载失败，点击重试'
        }
        onClick={() => {
          if (stickyStatus.mode !== 'desktop') void retryDesktop()
        }}
      >
        <Icon name="pin" size={12} />
        {stickyStatus.mode === 'desktop'
          ? '已固定在桌面'
          : stickyStatus.message || '普通窗口 · 点此重试'}
      </button>

      {modules.length === 0 ? (
        <div className="sticky-empty tall">
          <span className="sticky-empty-icon">
            <Icon name="pin" size={22} />
          </span>
          <strong>便签还没有内容</strong>
          <p>在「设置 → 桌面便签」中选择要显示的模块。</p>
          <button type="button" className="sticky-primary" onClick={openMain}>
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
                  <i>{counts[module]}</i>
                </button>
              )
            })}
          </nav>

          <div className="sticky-actionbar">
            <button
              type="button"
              className="sticky-action-primary"
              onClick={addCurrent}
              disabled={!activeModule}
            >
              <Icon name="plus" size={14} />
              新增{activeModule ? MODULE_META[activeModule].label : ''}
            </button>
            <button
              type="button"
              className="sticky-action-secondary"
              onClick={openMain}
            >
              打开工作台
            </button>
          </div>

          <main className="sticky-body">
            {activeModule === 'tasks' && (
              <section className="sticky-note-list">
                {openTasks.length === 0 ? (
                  <div className="sticky-empty">
                    <span className="sticky-empty-icon">
                      <Icon name="check" size={20} />
                    </span>
                    <strong>{MODULE_META.tasks.empty}</strong>
                    <p>{MODULE_META.tasks.hint}</p>
                  </div>
                ) : (
                  openTasks.map((task) => {
                    const project = task.projectId
                      ? projects.find((item) => item.id === task.projectId)
                      : undefined
                    return (
                      <div className="sticky-note-item" key={task.id}>
                        <TaskCheckbox
                          done={task.done}
                          onChange={() =>
                            void updateTask(task.id, { done: !task.done })
                          }
                        />
                        <div className="sticky-note-main">
                          <div className="sticky-note-title">{task.title}</div>
                          <div className="sticky-note-meta">
                            <span
                              className={
                                task.dueDate && task.dueDate < today
                                  ? 'sticky-due overdue'
                                  : 'sticky-due'
                              }
                            >
                              <Icon name="clock" size={11} />
                              {taskBadge(task, today)}
                            </span>
                            {project && (
                              <span className="sticky-meta-project">
                                {project.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="sticky-note-actions">
                          <button
                            type="button"
                            className="sticky-icon"
                            title="详细编辑"
                            onClick={() => openEditor('task', task.id)}
                          >
                            <Icon name="pen" size={12} />
                          </button>
                          <button
                            type="button"
                            className="sticky-icon"
                            title="删除"
                            onClick={() => removeTask(task)}
                          >
                            <Icon name="trash" size={12} />
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </section>
            )}

            {activeModule === 'projects' && (
              <section className="sticky-note-list">
                {activeProjects.length === 0 ? (
                  <div className="sticky-empty">
                    <span className="sticky-empty-icon">
                      <Icon name="folder" size={20} />
                    </span>
                    <strong>{MODULE_META.projects.empty}</strong>
                    <p>{MODULE_META.projects.hint}</p>
                  </div>
                ) : (
                  activeProjects.map(({ project, percent, latest }) => (
                    <div className="sticky-note-item project" key={project.id}>
                      <span
                        className="sticky-dot"
                        style={{ background: project.color }}
                      />
                      <div className="sticky-note-main">
                        <div className="sticky-note-title">{project.name}</div>
                        <div className="sticky-note-meta">
                          <span>{percent}% 完成</span>
                          {latest && (
                            <span className="sticky-meta-project">
                              {latest}
                            </span>
                          )}
                        </div>
                        <div className="sticky-mini-progress">
                          <span
                            style={{
                              width: `${percent}%`,
                              background: project.color
                            }}
                          />
                        </div>
                      </div>
                      <div className="sticky-note-actions">
                        <button
                          type="button"
                          className="sticky-icon"
                          title="记录进展"
                          onClick={() =>
                            void addProjectProgress(project, percent)
                          }
                        >
                          <Icon name="target" size={12} />
                        </button>
                        <button
                          type="button"
                          className="sticky-icon"
                          title="详细编辑"
                          onClick={() => openEditor('project', project.id)}
                        >
                          <Icon name="pen" size={12} />
                        </button>
                        <button
                          type="button"
                          className="sticky-icon"
                          title="删除"
                          onClick={() => removeProject(project)}
                        >
                          <Icon name="trash" size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </section>
            )}

            {activeModule === 'checkin' && (
              <section className="sticky-note-list">
                {checkins.length === 0 ? (
                  <div className="sticky-empty">
                    <span className="sticky-empty-icon">
                      <Icon name="flame" size={20} />
                    </span>
                    <strong>{MODULE_META.checkin.empty}</strong>
                    <p>{MODULE_META.checkin.hint}</p>
                  </div>
                ) : (
                  checkins.map((item) => {
                    const done = checkedToday.has(item.id)
                    return (
                      <div className="sticky-note-item" key={item.id}>
                        <span
                          className="sticky-dot"
                          style={{ background: item.color }}
                        />
                        <div className="sticky-note-main">
                          <div className="sticky-note-title">{item.name}</div>
                          <div className="sticky-note-meta">
                            {PERIOD_LABEL[item.period] ?? '本月'}目标{' '}
                            {item.targetDays} 天
                          </div>
                        </div>
                        <div className="sticky-note-actions">
                          <button
                            type="button"
                            className="sticky-icon"
                            title="详细编辑"
                            onClick={() => openEditor('checkin', item.id)}
                          >
                            <Icon name="pen" size={12} />
                          </button>
                          <button
                            type="button"
                            className="sticky-icon"
                            title="删除"
                            onClick={() => removeCheckin(item)}
                          >
                            <Icon name="trash" size={12} />
                          </button>
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
              <section className="sticky-note-list">
                {todaySlots.length === 0 ? (
                  <div className="sticky-empty">
                    <span className="sticky-empty-icon">
                      <Icon name="book" size={20} />
                    </span>
                    <strong>{MODULE_META.courses.empty}</strong>
                    <p>{MODULE_META.courses.hint}</p>
                  </div>
                ) : (
                  todaySlots.map(({ course, slot }, index) => (
                    <div
                      className="sticky-note-item course"
                      key={`${course.id}-${index}`}
                    >
                      <div className="sticky-course-time">
                        <strong>{slot.startTime}</strong>
                        <span>{slot.endTime}</span>
                      </div>
                      <div className="sticky-note-main">
                        <div className="sticky-note-title">{course.name}</div>
                        <div className="sticky-note-meta">
                          {course.location || course.teacher || '课程'}
                        </div>
                      </div>
                      <div className="sticky-note-actions">
                        <button
                          type="button"
                          className="sticky-icon"
                          title="详细编辑"
                          onClick={() => openEditor('course', course.id)}
                        >
                          <Icon name="pen" size={12} />
                        </button>
                        <button
                          type="button"
                          className="sticky-icon"
                          title="删除"
                          onClick={() => removeCourse(course)}
                        >
                          <Icon name="trash" size={12} />
                        </button>
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
        <span>本地保存 · 实时同步</span>
        <div className="sticky-footer-actions">
          <button
            type="button"
            className="sticky-icon"
            title="新增"
            onClick={addCurrent}
            disabled={!activeModule}
          >
            <Icon name="plus" size={14} />
          </button>
          <button
            type="button"
            className="sticky-icon"
            title="打开工作台"
            onClick={openMain}
          >
            <Icon name="maximize" size={13} />
          </button>
        </div>
      </footer>
    </div>
  )
}
