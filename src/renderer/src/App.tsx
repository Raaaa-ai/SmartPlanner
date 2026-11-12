import { WorkspaceProvider } from './state/WorkspaceContext'
import { EdgeTabs } from './views/EdgeTabs'
import { QuickCapture } from './views/QuickCapture'
import { Workbench } from './views/Workbench'

export default function App(): React.JSX.Element {
  const hash = window.location.hash

  if (hash === '#quick') return <QuickCapture />
  if (hash === '#edge') return <EdgeTabs />

  return (
    <WorkspaceProvider>
      <Workbench />
    </WorkspaceProvider>
  )
}
