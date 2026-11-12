import { useEffect } from 'react'
import { Icon } from '../components/Icon'
import { NAV } from '../lib/nav'
import { applyAccent } from '../lib/theme'

export function EdgeTabs(): React.JSX.Element {
  useEffect(() => {
    document.body.classList.add('edge-mode')

    void window.api.getSnapshot().then((snapshot) => {
      applyAccent(snapshot.settings.accent)
    })

    return () => {
      document.body.classList.remove('edge-mode')
    }
  }, [])

  return (
    <div className="edge-rail">
      {NAV.map((item) => (
        <button
          key={item.key}
          className="edge-tab"
          title={item.label}
          onMouseEnter={() => window.api.activateEdge(item.key)}
          onClick={() => window.api.activateEdge(item.key)}
        >
          <Icon name={item.icon} size={15} />
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  )
}
