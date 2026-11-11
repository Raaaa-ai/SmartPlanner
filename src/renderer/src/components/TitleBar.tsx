import { useWorkspace } from '../state/WorkspaceContext'
import { Icon } from './Icon'

export function TitleBar(): React.JSX.Element {
  const { settings, updateSettings } = useWorkspace()
  const fixed = settings.fixedPosition

  return (
    <header className={fixed ? 'titlebar fixed' : 'titlebar'}>
      <div
        className="titlebar-brand"
        onDoubleClick={() => {
          if (!fixed) window.api.controlWindow('toggle-maximize')
        }}
      >
        <span className="titlebar-logo">S</span>
        <span className="titlebar-name">SmartPlanner</span>
        <span className="titlebar-state">
          {fixed ? '位置已固定' : '本地个人工作台'}
        </span>
      </div>

      <div className="titlebar-controls">
        <button
          className={fixed ? 'titlebar-button pin active' : 'titlebar-button pin'}
          title={fixed ? '解除固定，恢复拖动' : '固定窗口位置（固定后无法拖动）'}
          onClick={() => void updateSettings({ fixedPosition: !fixed })}
        >
          <Icon name="pin" size={15} />
        </button>
        <button
          className="titlebar-button"
          title="最小化"
          onClick={() => window.api.controlWindow('minimize')}
        >
          <Icon name="minimize" size={15} />
        </button>
        <button
          className="titlebar-button"
          title="最大化 / 还原"
          onClick={() => window.api.controlWindow('toggle-maximize')}
        >
          <Icon name="maximize" size={13} />
        </button>
        <button
          className="titlebar-button close"
          title="关闭"
          onClick={() => window.api.controlWindow('close')}
        >
          <Icon name="close" size={15} />
        </button>
      </div>
    </header>
  )
}
