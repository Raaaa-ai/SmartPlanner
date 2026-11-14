import { useLayoutEffect } from 'react'
import { WorkspaceProvider } from './state/WorkspaceContext'
import { ActivationView } from './views/ActivationView'
import { QuickCapture } from './views/QuickCapture'
import { StickyEditor } from './views/StickyEditor'
import { StickyNote } from './views/StickyNote'
import { Workbench } from './views/Workbench'

export default function App(): React.JSX.Element {
  const hash = window.location.hash

  useLayoutEffect(() => {
    document.body.classList.toggle('sticky-mode', hash === '#sticky')
    document.body.classList.toggle('editor-mode', hash.startsWith('#editor'))
    return () => {
      document.body.classList.remove('sticky-mode')
      document.body.classList.remove('editor-mode')
    }
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
  if (hash.startsWith('#editor')) {
    return (
      <WorkspaceProvider>
        <StickyEditor />
      </WorkspaceProvider>
    )
  }

  return (
    <WorkspaceProvider>
      <Workbench />
    </WorkspaceProvider>
  )
}
