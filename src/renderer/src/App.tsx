import { WorkspaceProvider } from './state/WorkspaceContext'
import { QuickCapture } from './views/QuickCapture'
import { Workbench } from './views/Workbench'

export default function App(): React.JSX.Element {
  const isQuickCapture = window.location.hash === '#quick'

  if (isQuickCapture) return <QuickCapture />

  return (
    <WorkspaceProvider>
      <Workbench />
    </WorkspaceProvider>
  )
}
