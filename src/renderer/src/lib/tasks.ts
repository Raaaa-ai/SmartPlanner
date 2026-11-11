import type { Task, TaskPriority } from '../../../shared/types'
import { parseISODate, todayISO, tomorrowISO } from './date'

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  high: '重要',
  normal: '普通',
  low: '低'
}

const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  high: 0,
  normal: 1,
  low: 2
}

export function sortOpenTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const aDue = a.dueDate || '9999-12-31'
    const bDue = b.dueDate || '9999-12-31'
    if (aDue !== bDue) return aDue.localeCompare(bDue)

    const aTime = a.dueTime || '99:99'
    const bTime = b.dueTime || '99:99'
    if (aTime !== bTime) return aTime.localeCompare(bTime)

    const weight = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]
    if (weight !== 0) return weight

    return b.createdAt - a.createdAt
  })
}

export function sortDoneTasks(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt)
  )
}

export function todayTasks(tasks: Task[], today = todayISO()): Task[] {
  return sortOpenTasks(
    tasks.filter(
      (task) => !task.done && task.dueDate !== '' && task.dueDate <= today
    )
  )
}

export function tomorrowTasks(tasks: Task[]): Task[] {
  return sortOpenTasks(
    tasks.filter((task) => !task.done && task.dueDate === tomorrowISO())
  )
}

export function isOverdue(task: Task, today = todayISO()): boolean {
  return !task.done && task.dueDate !== '' && task.dueDate < today
}

export function dueText(task: Task, today = todayISO()): string {
  if (!task.dueDate) return '无日期'

  const time = task.dueTime ? ` ${task.dueTime}` : ''
  if (task.done) return `${shortDate(task.dueDate)}${time}`
  if (task.dueDate === today) return `今天${time}`
  if (task.dueDate < today) return `已逾期 · ${shortDate(task.dueDate)}${time}`
  if (task.dueDate === tomorrowISO()) return `明天${time}`
  return `${shortDate(task.dueDate)}${time}`
}

export function shortDate(iso: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric'
  }).format(parseISODate(iso))
}
