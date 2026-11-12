import { useEffect, useState } from 'react'
import type {
  CleanupKind,
  CloseAction,
  WindowCorner
} from '../../../shared/types'
import { Icon } from '../components/Icon'
import { todayISO } from '../lib/date'
import { useWorkspace } from '../state/WorkspaceContext'

const ACCENTS = [
  '#8a6a3f',
  '#3f5d4e',
  '#2f3e5c',
  '#9a4a35',
  '#6b5b7a',
  '#3c6e71',
  '#a37b5c',
  '#4a4a4a',
  '#111827',
  '#6b7280',
  '#d1d5db',
  '#ffffff'
]

const CORNER_LABEL: Record<WindowCorner, string> = {
  center: '屏幕居中',
  'top-left': '左上角',
  'top-right': '右上角',
  'bottom-left': '左下角',
  'bottom-right': '右下角'
}

function Switch({
  on,
  onChange,
  disabled = false
}: {
  on: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}): React.JSX.Element {
  return (
    <button
      type="button"
      className={on ? 'switch on' : 'switch'}
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
    />
  )
}

export function SettingsView(): React.JSX.Element {
  const {
    settings,
    version,
    license,
    tasks,
    reflections,
    anniversaries,
    updateStatus,
    updateSettings,
    chooseDataDir,
    useDefaultDataDir,
    checkForUpdates,
    installUpdate,
    cleanupData
  } = useWorkspace()
  const [bgOpacity, setBgOpacity] = useState(settings.backgroundOpacity)
  const [switching, setSwitching] = useState(false)
  const [checking, setChecking] = useState(false)

  const completedTaskCount = tasks.filter((task) => task.done).length
  const pastReflectionCount = reflections.filter(
    (item) => item.date < todayISO()
  ).length
  const expiredAnniversaryCount = anniversaries.filter(
    (item) => item.repeat === 'once' && item.date < todayISO()
  ).length

  async function handleCleanup(
    kind: CleanupKind,
    label: string,
    count: number
  ): Promise<void> {
    if (count === 0) {
      window.alert(`${label}：没有需要清理的数据。`)
      return
    }
    if (!window.confirm(`确定删除${label}的 ${count} 条数据吗？删除后不可恢复。`)) {
      return
    }
    const removed = await cleanupData(kind)
    window.alert(`已清理 ${removed} 条${label}。`)
  }

  useEffect(() => {
    setBgOpacity(settings.backgroundOpacity)
  }, [settings.backgroundOpacity])

  async function handleCheckUpdate(): Promise<void> {
    if (checking) return
    setChecking(true)
    await checkForUpdates()
    setChecking(false)
  }

  const updateText = (() => {
    if (updateStatus.state === 'checking') return '正在检查更新…'
    if (updateStatus.state === 'available')
      return `发现新版本 ${updateStatus.version ?? ''}，正在后台下载…`
    if (updateStatus.state === 'downloading')
      return `正在下载 ${updateStatus.version ?? ''} · ${updateStatus.percent ?? 0}%`
    if (updateStatus.state === 'downloaded')
      return `新版本 ${updateStatus.version ?? ''} 已下载，重启即可安装`
    if (updateStatus.state === 'not-available')
      return updateStatus.message ?? '当前已经是最新版本'
    if (updateStatus.state === 'error')
      return `检查失败：${updateStatus.message ?? '网络或发布源异常'}`
    return '启动后会自动检查更新'
  })()

  async function handleChooseDir(): Promise<void> {
    if (switching) return
    setSwitching(true)
    await chooseDataDir()
    setSwitching(false)
  }

  return (
    <div className="settings-stack">
      <section className="card panel">
        <div className="panel-head">
          <h3>外观</h3>
        </div>

        <div className="settings-row">
          <div className="settings-info">
            <strong>主题色</strong>
            <span>导航、按钮和强调色会立即切换。</span>
          </div>
          <div className="settings-control accent-control">
            <div className="swatches">
              {ACCENTS.map((color) => (
                <button
                  key={color}
                  className={color === settings.accent ? 'swatch active' : 'swatch'}
                  style={{ background: color }}
                  onClick={() => void updateSettings({ accent: color })}
                  aria-label={`主题色 ${color}`}
                />
              ))}
              <label className="custom-color" title="自定义颜色">
                <input
                  type="color"
                  value={settings.accent}
                  onChange={(event) =>
                    void updateSettings({ accent: event.target.value })
                  }
                />
                <Icon name="spark" size={14} />
              </label>
            </div>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-info">
            <strong>背景模糊（Windows 11）</strong>
            <span>
              窗口背景半透明并模糊桌面，文字和卡片保持不透明，不受背景干扰。
            </span>
          </div>
          <Switch
            on={settings.backgroundBlur}
            onChange={(value) => void updateSettings({ backgroundBlur: value })}
          />
        </div>

        <div className="settings-row">
          <div className="settings-info">
            <strong>背景不透明度</strong>
            <span>数值越高背景越实，越低越能透出后面的模糊背景。</span>
          </div>
          <div className="settings-control opacity-control">
            <input
              className="range"
              type="range"
              min={50}
              max={100}
              step={5}
              value={bgOpacity}
              disabled={!settings.backgroundBlur}
              onChange={(event) => setBgOpacity(Number(event.target.value))}
              onPointerUp={(event) =>
                void updateSettings({
                  backgroundOpacity: Number(event.currentTarget.value)
                })
              }
              onKeyUp={(event) =>
                void updateSettings({
                  backgroundOpacity: Number(event.currentTarget.value)
                })
              }
            />
            <span className="range-value">{bgOpacity}%</span>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-info">
            <strong>界面缩放</strong>
            <span>文字偏小或发虚时可以放大界面，窗口内会自动滚动。</span>
          </div>
          <select
            className="select compact"
            value={settings.uiScale}
            onChange={(event) =>
              void updateSettings({ uiScale: Number(event.target.value) })
            }
          >
            <option value={90}>90%</option>
            <option value={100}>100%</option>
            <option value={110}>110%</option>
            <option value={125}>125%</option>
            <option value={150}>150%</option>
          </select>
        </div>

        <div className="settings-row">
          <div className="settings-info">
            <strong>恢复默认外观</strong>
            <span>恢复默认主题色、关闭背景模糊、100% 界面缩放，并取消置顶和固定。</span>
          </div>
          <button
            className="ghost-button"
            onClick={() =>
              void updateSettings({
                accent: '#8a6a3f',
                backgroundBlur: false,
                backgroundOpacity: 80,
                uiScale: 100,
                alwaysOnTop: false,
                fixedPosition: false,
                windowCorner: 'center',
                sidebarCollapsed: false,
                edgeAutoHide: false
              })
            }
          >
            恢复默认
          </button>
        </div>
      </section>

      <section className="card panel">
        <div className="panel-head">
          <h3>窗口</h3>
        </div>

        <div className="settings-row">
          <div className="settings-info">
            <strong>置顶显示</strong>
            <span>
              {settings.edgeAutoHide
                ? '贴边自动隐藏开启时，窗口会置于其他窗口下层。'
                : '让工作台始终显示在其他窗口上方。'}
            </span>
          </div>
          <Switch
            on={settings.alwaysOnTop}
            disabled={settings.edgeAutoHide}
            onChange={(value) => void updateSettings({ alwaysOnTop: value })}
          />
        </div>

        <div className="settings-row">
          <div className="settings-info">
            <strong>固定窗口位置</strong>
            <span>开启后窗口保持当前位置且无法拖动，关闭后恢复拖动。</span>
          </div>
          <Switch
            on={settings.fixedPosition}
            onChange={(value) => void updateSettings({ fixedPosition: value })}
          />
        </div>

        <div className="settings-row">
          <div className="settings-info">
            <strong>停靠位置</strong>
            <span>固定状态下可快速移动到屏幕指定位置。</span>
          </div>
          <select
            className="select compact"
            value={settings.windowCorner}
            disabled={!settings.fixedPosition}
            onChange={(event) =>
              void updateSettings({
                windowCorner: event.target.value as WindowCorner
              })
            }
          >
            {(Object.keys(CORNER_LABEL) as WindowCorner[]).map((corner) => (
              <option key={corner} value={corner}>
                {CORNER_LABEL[corner]}
              </option>
            ))}
          </select>
        </div>

        <div className="settings-row">
          <div className="settings-info">
            <strong>收起侧栏</strong>
            <span>只保留图标导航，给内容区腾出更多空间。</span>
          </div>
          <Switch
            on={settings.sidebarCollapsed}
            onChange={(value) =>
              void updateSettings({ sidebarCollapsed: value })
            }
          />
        </div>

        <div className="settings-row">
          <div className="settings-info">
            <strong>贴边自动隐藏</strong>
            <span>
              主界面会滑到屏幕右侧下层，屏幕右边缘保留「今日」「待办」等竖排标签；鼠标移到标签上自动展开。
            </span>
          </div>
          <Switch
            on={settings.edgeAutoHide}
            onChange={(value) => void updateSettings({ edgeAutoHide: value })}
          />
        </div>

        <div className="settings-row">
          <div className="settings-info">
            <strong>关闭窗口时</strong>
            <span>选择关闭按钮的行为；选「每次询问」可在关闭时再决定。</span>
          </div>
          <select
            className="select compact"
            value={settings.closeAction}
            onChange={(event) =>
              void updateSettings({
                closeAction: event.target.value as CloseAction
              })
            }
          >
            <option value="ask">每次询问</option>
            <option value="tray">最小化到托盘</option>
            <option value="quit">彻底退出</option>
          </select>
        </div>
      </section>

      <section className="card panel">
        <div className="panel-head">
          <h3>存储</h3>
        </div>

        <div className="settings-row">
          <div className="settings-info">
            <strong>本地数据目录</strong>
            <span>
              项目、进展和速记都保存在这里。目标目录为空时会复制当前数据；已有数据则直接载入。
            </span>
          </div>
          <div className="settings-control">
            <button
              className="ghost-button"
              onClick={() => void useDefaultDataDir()}
            >
              使用默认位置
            </button>
            <button
              className="ghost-button"
              onClick={() => void handleChooseDir()}
              disabled={switching}
            >
              {switching ? '选择中…' : '选择目录'}
            </button>
          </div>
        </div>

        <div className="path">{settings.dataDir}</div>

        <div className="settings-row">
          <div className="settings-info">
            <strong>备份</strong>
            <span>
              每天首次启动会自动备份到数据目录的 backups 文件夹，保留最近 20 份；也可以手动备份或导出。
            </span>
          </div>
          <div className="settings-control">
            <button
              className="ghost-button"
              onClick={async () => {
                const path = await window.api.backupNow()
                if (path) window.alert(`备份已保存到：${path}`)
              }}
            >
              立即备份
            </button>
            <button
              className="ghost-button"
              onClick={() => void window.api.openDataDir()}
            >
              打开目录
            </button>
            <button
              className="ghost-button"
              onClick={async () => {
                const path = await window.api.exportData()
                if (path) window.alert(`备份已保存到：${path}`)
              }}
            >
              导出备份
            </button>
          </div>
        </div>
      </section>

      <section className="card panel">
        <div className="panel-head">
          <h3>数据清理</h3>
          <span className="muted">删除后不可恢复</span>
        </div>

        <div className="settings-row">
          <div className="settings-info">
            <strong>已完成的待办</strong>
            <span>删除所有勾选完成的待办，只保留未完成的事项。</span>
          </div>
          <div className="settings-control">
            <span className="muted">{completedTaskCount} 条</span>
            <button
              className="ghost-button danger-text"
              disabled={completedTaskCount === 0}
              onClick={() =>
                void handleCleanup(
                  'completedTasks',
                  '已完成的待办',
                  completedTaskCount
                )
              }
            >
              <Icon name="trash" size={15} />
              一键删除
            </button>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-info">
            <strong>历史每日感悟</strong>
            <span>删除今天之前的每日感悟，今天及以后的内容会保留。</span>
          </div>
          <div className="settings-control">
            <span className="muted">{pastReflectionCount} 篇</span>
            <button
              className="ghost-button danger-text"
              disabled={pastReflectionCount === 0}
              onClick={() =>
                void handleCleanup(
                  'pastReflections',
                  '历史每日感悟',
                  pastReflectionCount
                )
              }
            >
              <Icon name="trash" size={15} />
              一键删除
            </button>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-info">
            <strong>已过期的一次性纪念日</strong>
            <span>删除日期已经过去、且不重复的纪念日。</span>
          </div>
          <div className="settings-control">
            <span className="muted">{expiredAnniversaryCount} 个</span>
            <button
              className="ghost-button danger-text"
              disabled={expiredAnniversaryCount === 0}
              onClick={() =>
                void handleCleanup(
                  'expiredAnniversaries',
                  '已过期的一次性纪念日',
                  expiredAnniversaryCount
                )
              }
            >
              <Icon name="trash" size={15} />
              一键删除
            </button>
          </div>
        </div>
      </section>

      <section className="card panel">
        <div className="panel-head">
          <h3>启动与快捷键</h3>
        </div>

        <div className="settings-row">
          <div className="settings-info">
            <strong>开机自启</strong>
            <span>登录 Windows 后自动在托盘中运行。</span>
          </div>
          <Switch
            on={settings.autoLaunch}
            onChange={(value) => void updateSettings({ autoLaunch: value })}
          />
        </div>

        <div className="settings-row">
          <div className="settings-info">
            <strong>快速记录</strong>
            <span>在任何应用中呼出速记小窗。</span>
          </div>
          <span className="shortcut-keys big">
            <kbd>Ctrl</kbd>
            <kbd>Alt</kbd>
            <kbd>Space</kbd>
          </span>
        </div>
      </section>

      <section className="card panel">
        <div className="panel-head">
          <h3>软件更新</h3>
          <span className="muted">当前版本 {version}</span>
        </div>

        <div className="settings-row">
          <div className="settings-info">
            <strong>自动检查更新</strong>
            <span>{updateText}</span>
          </div>
          <Switch
            on={settings.autoCheckUpdate}
            onChange={(value) =>
              void updateSettings({ autoCheckUpdate: value })
            }
          />
        </div>

        {updateStatus.state === 'downloading' && (
          <div className="update-progress">
            <div
              className="update-progress-fill"
              style={{ width: `${updateStatus.percent ?? 0}%` }}
            />
          </div>
        )}

        <div className="settings-row">
          <div className="settings-info">
            <strong>手动检查</strong>
            <span>从 GitHub Releases 获取最新版本，下载完成后可重启安装。</span>
          </div>
          <div className="settings-control">
            <button
              className="ghost-button"
              onClick={() => void handleCheckUpdate()}
              disabled={checking || updateStatus.state === 'downloading'}
            >
              {checking ? '检查中…' : '检查更新'}
            </button>
            {updateStatus.state === 'downloaded' && (
              <button className="primary-button" onClick={installUpdate}>
                重启安装
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="card panel">
        <div className="panel-head">
          <h3>授权</h3>
          <span className={license.activated ? 'license-badge' : 'muted'}>
            {license.activated ? '已激活 · 永久有效' : '未激活'}
          </span>
        </div>

        <div className="settings-row">
          <div className="settings-info">
            <strong>本机机器码</strong>
            <span>
              激活码只对当前电脑有效；重装系统或更换硬件后机器码会变化，需要重新签发。
            </span>
          </div>
          <div className="settings-control">
            <code className="machine-code small">{license.machineCode}</code>
            <button
              className="ghost-button"
              onClick={() => void window.api.copyText(license.machineCode)}
            >
              <Icon name="copy" size={15} />
              复制
            </button>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-info">
            <strong>授权信息</strong>
            <span>
              {license.label ? `授权给 ${license.label}` : '永久授权'}
              {license.issuedAt
                ? ` · 签发于 ${new Date(license.issuedAt).toLocaleDateString('zh-CN')}`
                : ''}
            </span>
          </div>
          <span className="license-badge">永久有效</span>
        </div>
      </section>

      <section className="card panel">
        <div className="panel-head">
          <h3>关于</h3>
        </div>
        <div className="settings-row">
          <div className="settings-info">
            <strong>SmartPlanner {version}</strong>
            <span>
              如果修改后界面没有变化，请从托盘菜单「退出」旧实例后重新启动。
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}
