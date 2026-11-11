import { useState } from 'react'
import { Icon, type IconName } from '../components/Icon'
import { TitleBar } from '../components/TitleBar'
import { CalendarView } from './CalendarView'
import { NotesView } from './NotesView'
import { ProjectsView } from './ProjectsView'
import { RecordCardsView } from './RecordCardsView'
import { ReflectionsView } from './ReflectionsView'
import { SettingsView } from './SettingsView'
import { TasksView } from './TasksView'
import { TodayView } from './TodayView'

type ModuleKey =
  | 'today'
  | 'tasks'
  | 'projects'
  | 'calendar'
  | 'records'
  | 'reflection'
  | 'notes'
  | 'settings'

const NAV: { key: ModuleKey; label: string; icon: IconName }[] = [
  { key: 'today', label: '今日', icon: 'sun' },
  { key: 'tasks', label: '待办', icon: 'tasks' },
  { key: 'projects', label: '项目', icon: 'folder' },
  { key: 'calendar', label: '月历', icon: 'calendar' },
  { key: 'records', label: '记录卡', icon: 'award' },
  { key: 'reflection', label: '每日感想', icon: 'pen' },
  { key: 'notes', label: '笔记', icon: 'note' },
  { key: 'settings', label: '设置', icon: 'settings' }
]

const NAV_GROUPS: { label: string; keys: ModuleKey[] }[] = [
  { label: '工作台', keys: ['today', 'tasks', 'projects', 'calendar'] },
  { label: '记录', keys: ['records', 'reflection', 'notes'] },
  { label: '系统', keys: ['settings'] }
]

const SUBTITLES: Record<ModuleKey, string> = {
  today: '把今天的重点放在一屏里',
  tasks: '短期待办与清单',
  projects: '长期项目的整体进度与每日进展',
  calendar: '当月每天的工作记录一览',
  records: '记录获奖、里程碑与值得纪念的事',
  reflection: '每天写一点，留下当时的想法',
  notes: '随手记下零散的想法与资料',
  settings: '外观、窗口、存储与启动项'
}

function ModuleContent({ active }: { active: ModuleKey }): React.JSX.Element {
  if (active === 'today') return <TodayView />
  if (active === 'tasks') return <TasksView />
  if (active === 'projects') return <ProjectsView />
  if (active === 'calendar') return <CalendarView />
  if (active === 'records') return <RecordCardsView />
  if (active === 'reflection') return <ReflectionsView />
  if (active === 'notes') return <NotesView />
  return <SettingsView />
}

function initialModule(): ModuleKey {
  const hash = window.location.hash.replace('#', '')
  const match = NAV.find((item) => item.key === hash)
  return match ? match.key : 'today'
}

export function Workbench(): React.JSX.Element {
  const [active, setActive] = useState<ModuleKey>(initialModule)
  const activeNav = NAV.find((item) => item.key === active)!

  return (
    <div className="window-frame">
      <TitleBar />

      <div className="app-shell">
        <aside className="sidebar">
          <nav className="nav">
            {NAV_GROUPS.map((group) => (
              <div className="nav-group" key={group.label}>
                <div className="nav-label">{group.label}</div>
                {group.keys.map((key) => {
                  const item = NAV.find((entry) => entry.key === key)!
                  return (
                    <button
                      key={item.key}
                      className={item.key === active ? 'nav-item active' : 'nav-item'}
                      onClick={() => setActive(item.key)}
                    >
                      <Icon name={item.icon} size={17} />
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </div>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="footer-shortcut">
              <span>快速记录</span>
              <span className="shortcut-keys">
                <kbd>Ctrl</kbd>
                <kbd>Alt</kbd>
                <kbd>Space</kbd>
              </span>
            </div>
            <div className="footer-status">
              <span className="status-dot" />
              数据保存在本地
            </div>
            <div className="footer-note">关闭窗口后仍在托盘运行</div>
          </div>
        </aside>

        <main className="main">
          <div className="main-inner">
            <header className="page-header">
              <div>
                <p className="page-kicker">SmartPlanner</p>
                <h1 className="page-title">{activeNav.label}</h1>
                <p className="page-sub">{SUBTITLES[active]}</p>
              </div>
              <div className="header-actions">
                <button
                  className="primary-button"
                  onClick={() => window.api.openQuickCapture()}
                >
                  <Icon name="plus" size={16} />
                  快速记录
                </button>
              </div>
            </header>

            <ModuleContent active={active} />
          </div>
        </main>
      </div>
    </div>
  )
}
