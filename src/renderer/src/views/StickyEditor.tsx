import { useEffect } from 'react'
import type {
  StickyEditorType,
  Weekday,
  CourseSemester
} from '../../../shared/types'
import { Icon } from '../components/Icon'
import { TaskModal } from '../components/TaskModal'
import { useWorkspace } from '../state/WorkspaceContext'
import { CheckinEditorModal } from './CheckinView'
import { CourseEditorModal } from './CoursesView'
import { ProjectModal } from './ProjectsView'

function parseEditorHash(): { type: StickyEditorType | null; id: string } {
  const hash = window.location.hash.replace(/^#/, '')
  const [route, query] = hash.split('?')
  if (route !== 'editor') return { type: null, id: '' }
  const params = new URLSearchParams(query || '')
  const type = params.get('type')
  const id = params.get('id') || ''
  if (
    type === 'task' ||
    type === 'project' ||
    type === 'checkin' ||
    type === 'course'
  ) {
    return { type, id }
  }
  return { type: null, id }
}

function MissingEditor({ onClose }: { onClose: () => void }): React.JSX.Element {
  return (
    <div className="modal-backdrop">
      <div className="modal editor-missing">
        <span className="empty-icon">
          <Icon name="trash" size={22} />
        </span>
        <h2>内容不存在</h2>
        <p className="muted">它可能已经被删除，请返回便签。</p>
        <button className="primary-button" onClick={onClose}>
          关闭
        </button>
      </div>
    </div>
  )
}

export function StickyEditor(): React.JSX.Element {
  const { type, id } = parseEditorHash()
  const { tasks, projects, checkins, courses } = useWorkspace()
  const close = (): void => window.api.closeEditor()

  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') window.api.closeEditor()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (!type) return <MissingEditor onClose={close} />

  if (type === 'task') {
    const task = id ? tasks.find((item) => item.id === id) : undefined
    if (id && !task) return <MissingEditor onClose={close} />
    return <TaskModal task={task} onClose={close} />
  }

  if (type === 'project') {
    const project = id ? projects.find((item) => item.id === id) : undefined
    if (id && !project) return <MissingEditor onClose={close} />
    return <ProjectModal project={project} onClose={close} />
  }

  if (type === 'checkin') {
    const checkin = id ? checkins.find((item) => item.id === id) : undefined
    if (id && !checkin) return <MissingEditor onClose={close} />
    return <CheckinEditorModal checkin={checkin} onClose={close} />
  }

  const course = id ? courses.find((item) => item.id === id) : undefined
  if (id && !course) return <MissingEditor onClose={close} />
  const weekdayValue = new Date().getDay()
  const defaultWeekday = (weekdayValue === 0 ? 7 : weekdayValue) as Weekday
  const month = new Date().getMonth()
  const defaultSemester: CourseSemester =
    month >= 7 || month === 0 ? 'fall' : 'spring'
  return (
    <CourseEditorModal
      mode="course"
      course={course}
      defaultWeekday={defaultWeekday}
      defaultSemester={defaultSemester}
      onClose={close}
    />
  )
}
