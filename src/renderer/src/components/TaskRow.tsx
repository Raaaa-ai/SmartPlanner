import { useState } from 'react'
import type { Task } from '../../../shared/types'
import { todayISO } from '../lib/date'
import { PRIORITY_LABEL, dueText, isOverdue } from '../lib/tasks'
import { useWorkspace } from '../state/WorkspaceContext'
import { Icon } from './Icon'
import { TaskCheckbox } from './TaskCheckbox'
import { TaskModal } from './TaskModal'

export function TaskRow({
  task,
  compact = false,
  hideProject = false
}: {
  task: Task
  compact?: boolean
  hideProject?: boolean
}): React.JSX.Element {
  const { projects, updateTask, deleteTask } = useWorkspace()
  const [editing, setEditing] = useState(false)
  const project = projects.find((item) => item.id === task.projectId)
  const today = todayISO()
  const overdue = isOverdue(task, today)
  const classes = ['task-item']
  if (compact) classes.push('compact')
  if (task.done) classes.push('done')

  return (
    <>
      <li className={classes.join(' ')}>
        <TaskCheckbox
          done={task.done}
          onChange={() => void updateTask(task.id, { done: !task.done })}
        />

        <div className="task-main">
          <div className="task-title">{task.title}</div>
          <div className="task-meta">
            <span className={overdue ? 'task-due overdue' : 'task-due'}>
              <Icon name="calendar" size={13} />
              {dueText(task, today)}
            </span>
            {task.location && (
              <span className="task-location">
                <Icon name="location" size={13} />
                {task.location}
              </span>
            )}
            {task.note.trim() && (
              <span className="task-extra" title={task.note}>
                <Icon name="note" size={13} />
                {task.note.trim()}
              </span>
            )}
            <span className="task-tags">
              <span className={`priority-badge priority-${task.priority}`}>
                {PRIORITY_LABEL[task.priority]}
              </span>
              {project && !hideProject && (
                <span
                  className="task-project"
                  style={{
                    color: project.color,
                    background: `${project.color}14`,
                    borderColor: `${project.color}40`
                  }}
                >
                  <span
                    className="task-color"
                    style={{ background: project.color }}
                  />
                  {project.name}
                </span>
              )}
            </span>
          </div>
        </div>

        <button
          className="icon-button tiny"
          title="编辑待办"
          onClick={() => setEditing(true)}
        >
          <Icon name="pen" size={14} />
        </button>
        <button
          className="icon-button tiny"
          title="删除待办"
          onClick={() => void deleteTask(task.id)}
        >
          <Icon name="trash" size={14} />
        </button>
      </li>

      {editing && (
        <TaskModal task={task} onClose={() => setEditing(false)} />
      )}
    </>
  )
}
