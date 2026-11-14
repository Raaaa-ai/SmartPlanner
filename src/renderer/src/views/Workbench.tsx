import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { TitleBar } from '../components/TitleBar'
import { NAV, NAV_GROUPS, type ModuleKey } from '../lib/nav'
import { useWorkspace } from '../state/WorkspaceContext'
import { AnniversariesView } from './AnniversariesView'
import { CalendarView } from './CalendarView'
import { CheckinView } from './CheckinView'
import { CoursesView } from './CoursesView'
import { NotesView } from './NotesView'
import { ProjectsView } from './ProjectsView'
import { RecordCardsView } from './RecordCardsView'
import { ReflectionsView } from './ReflectionsView'
import { SettingsView } from './SettingsView'
import { TasksView } from './TasksView'
import { TodayView } from './TodayView'

const SUBTITLES: Record<ModuleKey, string> = {
  today: '把今天的重点放在一屏里',
  tasks: '今天、一周内与未来的待办安排',
  projects: '长期项目的整体进度与每日进展',
  calendar: '当月每天的工作记录一览',
  courses: '本周课表与选课计划',
  checkin: '为目标坚持打卡，看看这个月的进度',
  records: '记录获奖、里程碑与值得纪念的事',
  anniversary: '记住重要的日子，看看还有多少天',
  reflection: '每天写一点，留下当时的想法',
  notes: '想法笔记与速记都收在这里',
  settings: '外观、窗口、存储、更新与启动项'
}

function ModuleContent({ active }: { active: ModuleKey }): React.JSX.Element {
  if (active === 'today') return <TodayView />
  if (active === 'tasks') return <TasksView />
  if (active === 'projects') return <ProjectsView />
  if (active === 'calendar') return <CalendarView />
  if (active === 'courses') return <CoursesView />
  if (active === 'checkin') return <CheckinView />
  if (active === 'records') return <RecordCardsView />
  if (active === 'anniversary') return <AnniversariesView />
  if (active === 'reflection') return <ReflectionsView />
  if (active === 'notes') return <NotesView />
  return <SettingsView />
}

function initialModule(): ModuleKey {
  const hash = window.location.hash.replace('#', '')
  const match = NAV.find((item) => item.key === hash)
  return match ? match.key : 'today'
}

function UpdateBanner(): React.JSX.Element | null {
  const { updateStatus, installUpdate } = useWorkspace()
  const [dismissed, setDismissed] = useState(false)

  if (updateStatus.state === 'downloaded' && !dismissed) {
    return (
      <div className="update-banner">
        <div className="update-banner-text">
          <Icon name="spark" size={16} />
          <span>
            新版本 {updateStatus.version ?? ''} 已下载，重启后自动安装
          </span>
        </div>
        <div className="update-banner-actions">
          <button className="ghost-button" onClick={() => setDismissed(true)}>
            稍后
          </button>
          <button className="primary-button" onClick={installUpdate}>
            立即重启安装
          </button>
        </div>
      </div>
    )
  }

  if (updateStatus.state === 'downloading') {
    return (
      <div className="update-banner downloading">
        <div className="update-banner-text">
          <Icon name="spark" size={16} />
          <span>
            正在后台下载新版本 {updateStatus.version ?? ''}
            {typeof updateStatus.percent === 'number'
              ? ` · ${updateStatus.percent}%`
              : ''}
          </span>
        </div>
        <span className="muted update-banner-note">可以继续使用</span>
      </div>
    )
  }

  return null
}

export function Workbench(): React.JSX.Element {
  const { settings, updateSettings } = useWorkspace()
  const [active, setActive] = useState<ModuleKey>(initialModule)
  const activeNav = NAV.find((item) => item.key === active)!
  const collapsed = settings.sidebarCollapsed

  useEffect(() => {
    return window.api.onNavigate((key) => {
      if (NAV.some((item) => item.key === key)) {
        setActive(key as ModuleKey)
      }
    })
  }, [])

  return (
    <div
      className={collapsed ? 'window-frame sidebar-collapsed' : 'window-frame'}
    >
      <TitleBar />

      <div className="app-shell">
        <aside className={collapsed ? 'sidebar collapsed' : 'sidebar'}>
          <div className="sidebar-top">
            {!collapsed && (
              <div className="brand">
                <span className="brand-logo">S</span>
                <div>
                  <div className="brand-name">SmartPlanner</div>
                  <div className="brand-sub">本地个人工作台</div>
                </div>
              </div>
            )}
            <button
              className="sidebar-collapse"
              title={collapsed ? '展开侧栏' : '收起侧栏'}
              onClick={() =>
                void updateSettings({ sidebarCollapsed: !collapsed })
              }
            >
              <Icon
                name={collapsed ? 'chevron-right' : 'chevron-left'}
                size={16}
              />
            </button>
          </div>

          <nav className="nav">
            {NAV_GROUPS.map((group) => (
              <div className="nav-group" key={group.label}>
                {!collapsed && <div className="nav-label">{group.label}</div>}
                {group.keys.map((key) => {
                  const item = NAV.find((entry) => entry.key === key)!
                  return (
                    <button
                      key={item.key}
                      className={item.key === active ? 'nav-item active' : 'nav-item'}
                      title={collapsed ? item.label : undefined}
                      onClick={() => setActive(item.key)}
                    >
                      <Icon name={item.icon} size={17} />
                      {!collapsed && <span>{item.label}</span>}
                    </button>
                  )
                })}
              </div>
            ))}
          </nav>

          <div className="sidebar-footer">
            {!collapsed ? (
              <>
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
              </>
            ) : (
              <div className="footer-status compact">
                <span className="status-dot" />
              </div>
            )}
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
                  className="ghost-button"
                  onClick={() => window.api.openSticky()}
                >
                  <Icon name="pin" size={15} />
                  桌面便签
                </button>
                <button
                  className="primary-button"
                  onClick={() => window.api.openQuickCapture()}
                >
                  <Icon name="plus" size={16} />
                  快速记录
                </button>
              </div>
            </header>

            <UpdateBanner />
            <ModuleContent active={active} />
          </div>
        </main>
      </div>
    </div>
  )
}
