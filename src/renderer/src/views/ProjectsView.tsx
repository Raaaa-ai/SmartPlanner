import { useMemo, useState } from 'react'
import type { Project, ProjectInput, ProjectStatus, ProgressEntry } from '../../../shared/types'
import { Icon } from '../components/Icon'
import { TaskModal } from '../components/TaskModal'
import { TaskRow } from '../components/TaskRow'
import { COLOR_PALETTE } from '../lib/colors'
import { formatDayDate, todayISO } from '../lib/date'
import { sortDoneTasks, sortOpenTasks } from '../lib/tasks'
import { useWorkspace } from '../state/WorkspaceContext'

const STATUS_LABEL: Record<ProjectStatus, string> = {
  active: '进行中',
  paused: '已暂停',
  done: '已完成'
}

const PROJECT_COLORS = COLOR_PALETTE

function entriesOf(projectId: string, progress: ProgressEntry[]): ProgressEntry[] {
  return progress
    .filter((entry) => entry.projectId === projectId)
    .sort((a, b) =>
      a.date === b.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date)
    )
}

function ProjectCard({
  project,
  entries,
  planCount,
  onOpen,
  sorting = false,
  canUp = false,
  canDown = false,
  onMoveUp,
  onMoveDown
}: {
  project: Project
  entries: ProgressEntry[]
  planCount: number
  onOpen: () => void
  sorting?: boolean
  canUp?: boolean
  canDown?: boolean
  onMoveUp?: () => void
  onMoveDown?: () => void
}): React.JSX.Element {
  const percent = entries[0]?.percent ?? 0

  return (
    <div
      className={sorting ? 'project-card card sorting' : 'project-card card'}
      role="button"
      tabIndex={0}
      onClick={() => {
        if (!sorting) onOpen()
      }}
      onKeyDown={(event) => {
        if (!sorting && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          onOpen()
        }
      }}
    >
      {sorting && (
        <div className="project-sort-actions">
          <button
            type="button"
            className="icon-button tiny"
            disabled={!canUp}
            title="上移"
            onClick={(event) => {
              event.stopPropagation()
              onMoveUp?.()
            }}
          >
            <Icon name="chevron-left" size={14} className="rotate-up" />
          </button>
          <button
            type="button"
            className="icon-button tiny"
            disabled={!canDown}
            title="下移"
            onClick={(event) => {
              event.stopPropagation()
              onMoveDown?.()
            }}
          >
            <Icon name="chevron-right" size={14} className="rotate-down" />
          </button>
        </div>
      )}
      <div className="project-top">
        <span className="project-color" style={{ background: project.color }} />
        <span className="project-name">{project.name}</span>
        <span className={`status-badge status-${project.status}`}>
          {STATUS_LABEL[project.status]}
        </span>
      </div>

      <p className="project-desc">
        {project.description || '还没有项目描述'}
      </p>

      <div className="project-progress">
        <div className="progress-head">
          <span>整体进度</span>
          <strong>{percent}%</strong>
        </div>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${percent}%`, background: project.color }}
          />
        </div>
      </div>

      <div className="project-meta">
        <span>
          <Icon name="target" size={13} />
          {project.targetDate ? `目标 ${formatDayDate(project.targetDate)}` : '未设目标日期'}
        </span>
        <span>
          <Icon name="clock" size={13} />
          {entries.length} 条进展
        </span>
        <span>
          <Icon name="tasks" size={13} />
          {planCount} 项计划
        </span>
      </div>
    </div>
  )
}

export function ProjectModal({
  project,
  onClose
}: {
  project?: Project
  onClose: () => void
}): React.JSX.Element {
  const { createProject, updateProject } = useWorkspace()
  const [name, setName] = useState(project?.name ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [color, setColor] = useState(project?.color ?? PROJECT_COLORS[0])
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'active')
  const [startDate, setStartDate] = useState(project?.startDate ?? todayISO())
  const [targetDate, setTargetDate] = useState(project?.targetDate ?? '')
  const [saving, setSaving] = useState(false)

  const palette = Array.from(
    new Set([...PROJECT_COLORS, project?.color].filter(Boolean) as string[])
  )

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    if (!name.trim() || saving) return

    setSaving(true)
    const input: ProjectInput = {
      name: name.trim(),
      description,
      color,
      status,
      startDate,
      targetDate
    }

    if (project) {
      await updateProject(project.id, input)
    } else {
      await createProject(input)
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
          <h2 className="modal-title">{project ? '编辑项目' : '新建项目'}</h2>
          <button type="button" className="icon-button" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="form">
          <div className="field">
            <label htmlFor="project-name">项目名称</label>
            <input
              id="project-name"
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="例如：个人网站、读书计划、健身"
              autoFocus
            />
          </div>

          <div className="field">
            <label htmlFor="project-desc">项目描述</label>
            <textarea
              id="project-desc"
              className="textarea"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="这个项目想达成什么？"
            />
          </div>

          <div className="field">
            <label>项目颜色</label>
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

          <div className="row">
            <div className="field">
              <label htmlFor="project-status">状态</label>
              <select
                id="project-status"
                className="select"
                value={status}
                onChange={(event) => setStatus(event.target.value as ProjectStatus)}
              >
                <option value="active">进行中</option>
                <option value="paused">已暂停</option>
                <option value="done">已完成</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="project-start">开始日期</label>
              <input
                id="project-start"
                className="input"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="project-target">目标日期（可选）</label>
            <input
              id="project-target"
              className="input"
              type="date"
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
            />
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="primary-button" disabled={!name.trim() || saving}>
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </form>
    </div>
  )
}

function ProjectDetail({
  project,
  onBack,
  onEdit
}: {
  project: Project
  onBack: () => void
  onEdit: () => void
}): React.JSX.Element {
  const { progress, tasks, addProgress, deleteProgress, deleteProject } =
    useWorkspace()
  const entries = useMemo(() => entriesOf(project.id, progress), [project.id, progress])
  const currentPercent = entries[0]?.percent ?? 0

  const planTasks = tasks.filter((task) => task.projectId === project.id)
  const openPlans = sortOpenTasks(planTasks.filter((task) => !task.done))
  const donePlans = sortDoneTasks(planTasks.filter((task) => task.done))

  const [planModal, setPlanModal] = useState(false)
  const [date, setDate] = useState(todayISO())
  const [content, setContent] = useState('')
  const [percent, setPercent] = useState(currentPercent)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    if (!content.trim() || saving) return

    setSaving(true)
    const entry = await addProgress({
      projectId: project.id,
      date,
      content: content.trim(),
      percent
    })
    setSaving(false)
    if (entry) setContent('')
  }

  async function handleDelete(): Promise<void> {
    if (!window.confirm(`确定删除「${project.name}」及其所有进展吗？`)) return
    await deleteProject(project.id)
    onBack()
  }

  return (
    <div className="project-detail">
      <div className="detail-top">
        <button className="icon-button" onClick={onBack} title="返回项目列表">
          <Icon name="arrow-left" size={17} />
        </button>
        <span className="project-color large" style={{ background: project.color }} />
        <div className="detail-title">
          <h2>{project.name}</h2>
          <span className={`status-badge status-${project.status}`}>
            {STATUS_LABEL[project.status]}
          </span>
        </div>
        <div className="detail-actions">
          <button className="icon-button" onClick={onEdit} title="编辑项目">
            <Icon name="pen" size={16} />
          </button>
          <button className="icon-button danger" onClick={() => void handleDelete()} title="删除项目">
            <Icon name="trash" size={16} />
          </button>
        </div>
      </div>

      {project.description && <p className="detail-desc">{project.description}</p>}

      <div className="detail-stats">
        <div className="mini-stat">
          <span>当前进度</span>
          <strong style={{ color: project.color }}>{currentPercent}%</strong>
        </div>
        <div className="mini-stat">
          <span>开始日期</span>
          <strong>{formatDayDate(project.startDate)}</strong>
        </div>
        <div className="mini-stat">
          <span>目标日期</span>
          <strong>{project.targetDate ? formatDayDate(project.targetDate) : '未设置'}</strong>
        </div>
        <div className="mini-stat">
          <span>进展记录</span>
          <strong>{entries.length} 条</strong>
        </div>
      </div>

      <div className="progress-track large">
        <div
          className="progress-fill"
          style={{ width: `${currentPercent}%`, background: project.color }}
        />
      </div>

      <section className="card panel project-plan-panel">
        <div className="panel-head">
          <h3>项目计划</h3>
          <div className="panel-head-actions">
            <span className="muted">{openPlans.length} 项待完成</span>
            <button className="ghost-button" onClick={() => setPlanModal(true)}>
              <Icon name="plus" size={15} />
              添加计划
            </button>
          </div>
        </div>

        {planTasks.length === 0 ? (
          <p className="hint">
            还没有计划。把项目要做的事拆成带日期、时间、地点的计划项。
          </p>
        ) : (
          <>
            {openPlans.length > 0 && (
              <ul className="task-list compact">
                {openPlans.map((task) => (
                  <TaskRow key={task.id} task={task} compact hideProject />
                ))}
              </ul>
            )}
            {donePlans.length > 0 && (
              <div className="task-section">
                <div className="task-section-title">已完成计划</div>
                <ul className="task-list compact">
                  {donePlans.map((task) => (
                    <TaskRow key={task.id} task={task} compact hideProject />
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>

      {planModal && (
        <TaskModal
          defaultProjectId={project.id}
          onClose={() => setPlanModal(false)}
        />
      )}

      <div className="two-columns detail-columns">
        <section className="card panel">
          <div className="panel-head">
            <h3>记录进展</h3>
          </div>
          <form className="form" onSubmit={handleSubmit}>
            <div className="row">
              <div className="field">
                <label htmlFor="progress-date">日期</label>
                <input
                  id="progress-date"
                  className="input"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="progress-percent">整体进度</label>
                <div className="range-row">
                  <input
                    id="progress-percent"
                    className="range"
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={percent}
                    onChange={(event) => setPercent(Number(event.target.value))}
                  />
                  <span className="range-value">{percent}%</span>
                </div>
              </div>
            </div>

            <div className="field">
              <label htmlFor="progress-content">今天做了什么</label>
              <textarea
                id="progress-content"
                className="textarea"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="写一句今天的进展，会同步到月历"
              />
            </div>

            <button className="primary-button align-self-start" type="submit" disabled={saving}>
              <Icon name="plus" size={15} />
              {saving ? '保存中…' : '添加进展'}
            </button>
          </form>
        </section>

        <section className="card panel">
          <div className="panel-head">
            <h3>进展时间线</h3>
            <span className="muted">{entries.length} 条</span>
          </div>

          {entries.length === 0 ? (
            <div className="empty-state compact">
              <span className="empty-icon">
                <Icon name="clock" size={22} />
              </span>
              <div>
                <strong>还没有进展</strong>
                <p>添加第一条进展，开始累积这个项目。</p>
              </div>
            </div>
          ) : (
            <ol className="timeline">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="timeline-item"
                  style={{ '--dot': project.color } as React.CSSProperties}
                >
                  <div className="timeline-head">
                    <span className="timeline-date">{formatDayDate(entry.date)}</span>
                    <span className="percent-badge">{entry.percent}%</span>
                    <button
                      className="icon-button tiny"
                      title="删除这条进展"
                      onClick={() => void deleteProgress(entry.id)}
                    >
                      <Icon name="close" size={12} />
                    </button>
                  </div>
                  <div className="timeline-content">{entry.content}</div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  )
}

export function ProjectsView(): React.JSX.Element {
  const { projects, progress, tasks, reorderProjects } = useWorkspace()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [modal, setModal] = useState<{ project?: Project } | null>(null)
  const [sorting, setSorting] = useState(false)

  const selected = projects.find((project) => project.id === selectedId) ?? null

  async function moveProject(index: number, delta: number): Promise<void> {
    const target = index + delta
    if (target < 0 || target >= projects.length) return
    const next = [...projects]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    await reorderProjects(next.map((project) => project.id))
  }

  return (
    <>
      {selected ? (
        <ProjectDetail
          project={selected}
          onBack={() => setSelectedId(null)}
          onEdit={() => setModal({ project: selected })}
        />
      ) : (
        <>
          <div className="view-toolbar">
            <span className="muted">
              {sorting ? '使用上下箭头调整项目顺序' : `共 ${projects.length} 个项目`}
            </span>
            <div className="toolbar-actions">
              {projects.length > 1 && (
                <button
                  className="ghost-button"
                  onClick={() => setSorting((value) => !value)}
                >
                  {sorting ? '完成排序' : '手动排序'}
                </button>
              )}
              <button className="primary-button" onClick={() => setModal({})}>
                <Icon name="plus" size={16} />
                新建项目
              </button>
            </div>
          </div>

          {projects.length === 0 ? (
            <div className="card panel empty-state large">
              <span className="empty-icon">
                <Icon name="folder" size={24} />
              </span>
              <div>
                <strong>还没有项目</strong>
                <p>项目适合长期目标，每天记录进展，进度会自动进入月历。</p>
              </div>
              <button className="primary-button" onClick={() => setModal({})}>
                <Icon name="plus" size={16} />
                创建第一个项目
              </button>
            </div>
          ) : (
            <div className="projects-grid">
              {projects.map((project, index) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  entries={entriesOf(project.id, progress)}
                  planCount={tasks.filter((task) => task.projectId === project.id).length}
                  onOpen={() => setSelectedId(project.id)}
                  sorting={sorting}
                  canUp={index > 0}
                  canDown={index < projects.length - 1}
                  onMoveUp={() => void moveProject(index, -1)}
                  onMoveDown={() => void moveProject(index, 1)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {modal && <ProjectModal project={modal.project} onClose={() => setModal(null)} />}
    </>
  )
}
