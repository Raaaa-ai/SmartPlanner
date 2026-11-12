import { useState } from 'react'
import { Icon } from '../components/Icon'
import { TaskModal } from '../components/TaskModal'
import { TaskRow } from '../components/TaskRow'
import { addDaysISO, todayISO } from '../lib/date'
import { sortDoneTasks, sortOpenTasks } from '../lib/tasks'
import { useWorkspace } from '../state/WorkspaceContext'

type Filter = 'today' | 'week' | 'future' | 'done'

const EMPTY_COPY: Record<Filter, { title: string; hint: string }> = {
  today: {
    title: '今天没有待办',
    hint: '今天和已经逾期的待办会出现在这里。'
  },
  week: {
    title: '一周内没有安排',
    hint: '未来 7 天内到期的待办会出现在这里。'
  },
  future: {
    title: '未来还没有安排',
    hint: '更远的计划或未设置日期的待办会放在这里。'
  },
  done: {
    title: '还没有已完成的待办',
    hint: '完成一条待办后，会自动归档到这里。'
  }
}

export function TasksView(): React.JSX.Element {
  const { tasks } = useWorkspace()
  const [filter, setFilter] = useState<Filter>('today')
  const [creating, setCreating] = useState(false)

  const today = todayISO()
  const weekEnd = addDaysISO(today, 7)
  const openTasks = tasks.filter((task) => !task.done)
  const doneTasks = sortDoneTasks(tasks.filter((task) => task.done))

  const groups: Record<'today' | 'week' | 'future', typeof tasks> = {
    today: sortOpenTasks(
      openTasks.filter((task) => task.dueDate !== '' && task.dueDate <= today)
    ),
    week: sortOpenTasks(
      openTasks.filter(
        (task) =>
          task.dueDate !== '' && task.dueDate > today && task.dueDate <= weekEnd
      )
    ),
    future: sortOpenTasks(
      openTasks.filter(
        (task) => task.dueDate === '' || task.dueDate > weekEnd
      )
    )
  }

  const visible = filter === 'done' ? doneTasks : groups[filter]

  return (
    <div className="tasks-page">
      <div className="view-toolbar">
        <div className="segmented">
          <button
            className={filter === 'today' ? 'segment active' : 'segment'}
            onClick={() => setFilter('today')}
          >
            今天 {groups.today.length}
          </button>
          <button
            className={filter === 'week' ? 'segment active' : 'segment'}
            onClick={() => setFilter('week')}
          >
            一周内 {groups.week.length}
          </button>
          <button
            className={filter === 'future' ? 'segment active' : 'segment'}
            onClick={() => setFilter('future')}
          >
            未来 {groups.future.length}
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

      {visible.length === 0 ? (
        <div className="card panel empty-state large">
          <span className="empty-icon">
            <Icon name={filter === 'done' ? 'check' : 'tasks'} size={24} />
          </span>
          <div>
            <strong>{EMPTY_COPY[filter].title}</strong>
            <p>{EMPTY_COPY[filter].hint}</p>
          </div>
          {filter !== 'done' && (
            <button className="primary-button" onClick={() => setCreating(true)}>
              <Icon name="plus" size={16} />
              新建待办
            </button>
          )}
        </div>
      ) : (
        <div className="task-section">
          <div className="task-section-title">
            {filter === 'today' && '今天 · 含逾期'}
            {filter === 'week' && '未来 7 天'}
            {filter === 'future' && '未来与未安排'}
            {filter === 'done' && '已完成'}
          </div>
          <ul className="task-list">
            {visible.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </ul>
        </div>
      )}

      {creating && <TaskModal onClose={() => setCreating(false)} />}
    </div>
  )
}
