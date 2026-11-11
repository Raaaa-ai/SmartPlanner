import { useState } from 'react'
import type { Task, TaskInput, TaskPriority } from '../../../shared/types'
import { todayISO } from '../lib/date'
import { useWorkspace } from '../state/WorkspaceContext'
import { Icon } from './Icon'

export function TaskModal({
  task,
  defaultProjectId = '',
  defaultDate,
  onClose
}: {
  task?: Task
  defaultProjectId?: string
  defaultDate?: string
  onClose: () => void
}): React.JSX.Element {
  const { projects, createTask, updateTask } = useWorkspace()
  const [title, setTitle] = useState(task?.title ?? '')
  const [note, setNote] = useState(task?.note ?? '')
  const [projectId, setProjectId] = useState(
    task?.projectId ?? defaultProjectId
  )
  const [priority, setPriority] = useState<TaskPriority>(
    task?.priority ?? 'normal'
  )
  const [dueDate, setDueDate] = useState(task?.dueDate ?? defaultDate ?? todayISO())
  const [dueTime, setDueTime] = useState(task?.dueTime ?? '')
  const [location, setLocation] = useState(task?.location ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    if (!title.trim() || saving) return

    setSaving(true)
    const input: TaskInput = {
      title: title.trim(),
      note,
      projectId: projectId || null,
      priority,
      dueDate,
      dueTime,
      location
    }

    if (task) {
      await updateTask(task.id, input)
    } else {
      await createTask(input)
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
      <form className="modal task-modal" onSubmit={handleSubmit}>
        <div className="modal-header">
          <h2 className="modal-title">
            {task ? '编辑待办 / 计划' : '新建待办 / 计划'}
          </h2>
          <button type="button" className="icon-button" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="form">
          <div className="field">
            <label htmlFor="task-title">标题</label>
            <input
              id="task-title"
              className="input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="要做什么？"
              autoFocus
            />
          </div>

          <div className="row">
            <div className="field">
              <label htmlFor="task-date">日期</label>
              <input
                id="task-date"
                className="input"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="task-time">时间</label>
              <input
                id="task-time"
                className="input"
                type="time"
                value={dueTime}
                onChange={(event) => setDueTime(event.target.value)}
              />
            </div>
          </div>

          <div className="row">
            <div className="field">
              <label htmlFor="task-priority">优先级</label>
              <select
                id="task-priority"
                className="select"
                value={priority}
                onChange={(event) =>
                  setPriority(event.target.value as TaskPriority)
                }
              >
                <option value="normal">普通</option>
                <option value="high">重要</option>
                <option value="low">低</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="task-project">关联项目</label>
              <select
                id="task-project"
                className="select"
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
              >
                <option value="">不关联</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="task-location">地点</label>
            <input
              id="task-location"
              className="input"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="例如：会议室 A / 图书馆 / 线上"
            />
          </div>

          <div className="field">
            <label htmlFor="task-note">备注</label>
            <textarea
              id="task-note"
              className="textarea"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="补充说明（可选）"
            />
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
