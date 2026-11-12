import type { IconName } from '../components/Icon'

export type ModuleKey =
  | 'today'
  | 'tasks'
  | 'projects'
  | 'calendar'
  | 'courses'
  | 'checkin'
  | 'records'
  | 'anniversary'
  | 'reflection'
  | 'notes'
  | 'settings'

export const NAV: { key: ModuleKey; label: string; icon: IconName }[] = [
  { key: 'today', label: '今日', icon: 'sun' },
  { key: 'tasks', label: '待办', icon: 'tasks' },
  { key: 'projects', label: '项目', icon: 'folder' },
  { key: 'calendar', label: '月历', icon: 'calendar' },
  { key: 'courses', label: '课程表', icon: 'book' },
  { key: 'checkin', label: '打卡', icon: 'flame' },
  { key: 'records', label: '记录卡', icon: 'award' },
  { key: 'anniversary', label: '纪念日', icon: 'gift' },
  { key: 'reflection', label: '每日感想', icon: 'pen' },
  { key: 'notes', label: '笔记', icon: 'note' },
  { key: 'settings', label: '设置', icon: 'settings' }
]

export const NAV_GROUPS: { label: string; keys: ModuleKey[] }[] = [
  { label: '工作台', keys: ['today', 'tasks', 'projects', 'calendar'] },
  { label: '学习', keys: ['courses', 'checkin'] },
  { label: '记录', keys: ['records', 'anniversary', 'reflection', 'notes'] },
  { label: '系统', keys: ['settings'] }
]
