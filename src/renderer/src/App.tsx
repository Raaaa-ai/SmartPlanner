import { useLayoutEffect } from 'react'
import { WorkspaceProvider } from './state/WorkspaceContext'
import { ActivationView } from './views/ActivationView'
import { QuickCapture } from './views/QuickCapture'
import { StickyNote } from './views/StickyNote'
import { Workbench } from './views/Workbench'

export default function App(): React.JSX.Element {
  const hash = window.location.hash

  useLayoutEffect(() => {
    if (hash !== '#sticky') return
    document.body.classList.add('sticky-mode')
    return () => document.body.classList.remove('sticky-mode')
  }, [hash])

  if (hash === '#activate') return <ActivationView />
  if (hash === '#quick') return <QuickCapture />
  if (hash === '#sticky') {
    return (
      <WorkspaceProvider>
        <StickyNote />
      </WorkspaceProvider>
    )
  }

  return (
    <WorkspaceProvider>
      <Workbench />
    </WorkspaceProvider>
  )
}
