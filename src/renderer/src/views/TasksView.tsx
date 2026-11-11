import { useState } from 'react'
import { Icon } from '../components/Icon'
import { TaskModal } from '../components/TaskModal'
import { TaskRow } from '../components/TaskRow'
import { sortDoneTasks, sortOpenTasks } from '../lib/tasks'
import { useWorkspace } from '../state/WorkspaceContext'

type Filter = 'all' | 'open' | 'done'

export function TasksView(): React.JSX.Element {
  const { tasks } = useWorkspace()
  const [filter, setFilter] = useState<Filter>('all')
  const [creating, setCreating] = useState(false)

  const openTasks = sortOpenTasks(tasks.filter((task) => !task.done))
  const doneTasks = sortDoneTasks(tasks.filter((task) => task.done))

  const showOpen = filter !== 'done'
  const showDone = filter !== 'open'
  const nothing =
    (filter === 'open' && openTasks.length === 0) ||
    (filter === 'done' && doneTasks.length === 0) ||
    (filter === 'all' && tasks.length === 0)

  return (
    <div className="tasks-page">
      <div className="view-toolbar">
        <div className="segmented">
          <button
            className={filter === 'all' ? 'segment active' : 'segment'}
            onClick={() => setFilter('all')}
          >
            全部 {tasks.length}
          </button>
          <button
            className={filter === 'open' ? 'segment active' : 'segment'}
            onClick={() => setFilter('open')}
          >
            未完成 {openTasks.length}
          </button>
          <button
            className={filter === 'done' ? 'segment active' : 'segment'}
            onClick={() => setFilter('done')}
          >
            已完成 {doneTasks.length}
          </button>
        </div>
        <button className="primary-button" onClick={() => setCreating(true)}>
          <Icon name="plus" size={16} />
          新建待办 / 计划
        </button>
      </div>

      {nothing && (
        <div className="card panel empty-state large">
          <span className="empty-icon">
            <Icon name="tasks" size={24} />
          </span>
          <div>
            <strong>{filter === 'done' ? '还没有已完成的待办' : '还没有待办'}</strong>
            <p>新建一条带日期、时间、地点的待办或项目计划。</p>
          </div>
          <button className="primary-button" onClick={() => setCreating(true)}>
            <Icon name="plus" size={16} />
            新建待办
          </button>
        </div>
      )}

      {showOpen && openTasks.length > 0 && (
        <ul className="task-list">
          {openTasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </ul>
      )}

      {showDone && doneTasks.length > 0 && (
        <div className="task-section">
          <div className="task-section-title">已完成</div>
          <ul className="task-list">
            {doneTasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </ul>
        </div>
      )}

      {creating && <TaskModal onClose={() => setCreating(false)} />}
    </div>
  )
}
