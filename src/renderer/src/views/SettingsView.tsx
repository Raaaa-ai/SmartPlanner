import { useEffect, useState } from 'react'
import type { CloseAction, WindowCorner } from '../../../shared/types'
import { Icon } from '../components/Icon'
import { useWorkspace } from '../state/WorkspaceContext'

const ACCENTS = [
  '#8a6a3f',
  '#3f5d4e',
  '#2f3e5c',
  '#9a4a35',
  '#6b5b7a',
  '#3c6e71',
  '#a37b5c',
  '#4a4a4a'
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
  onChange
}: {
  on: boolean
  onChange: (value: boolean) => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      className={on ? 'switch on' : 'switch'}
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
    />
  )
}

export function SettingsView(): React.JSX.Element {
  const { settings, updateSettings, chooseDataDir, useDefaultDataDir } =
    useWorkspace()
  const [bgOpacity, setBgOpacity] = useState(settings.backgroundOpacity)
  const [switching, setSwitching] = useState(false)

  useEffect(() => {
    setBgOpacity(settings.backgroundOpacity)
  }, [settings.backgroundOpacity])

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
                windowCorner: 'center'
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
            <span>让工作台始终显示在其他窗口上方。</span>
          </div>
          <Switch
            on={settings.alwaysOnTop}
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
          <h3>关于</h3>
        </div>
        <div className="settings-row">
          <div className="settings-info">
            <strong>SmartPlanner 0.2.0</strong>
            <span>
              如果修改后界面没有变化，请从托盘菜单「退出」旧实例后重新启动。
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}
