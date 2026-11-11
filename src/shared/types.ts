export type ProjectStatus = 'active' | 'paused' | 'done'

export type WindowCorner =
  | 'center'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'

export type WindowAction = 'minimize' | 'toggle-maximize' | 'close'

export type CloseAction = 'ask' | 'tray' | 'quit'

export interface Project {
  id: string
  name: string
  description: string
  color: string
  status: ProjectStatus
  startDate: string
  targetDate: string
  createdAt: number
  updatedAt: number
}

export interface ProjectInput {
  name: string
  description?: string
  color?: string
  status?: ProjectStatus
  startDate?: string
  targetDate?: string
}

export interface ProgressEntry {
  id: string
  projectId: string
  date: string
  content: string
  percent: number
  createdAt: number
}

export interface ProgressInput {
  projectId: string
  date: string
  content: string
  percent: number
}

export type TaskPriority = 'low' | 'normal' | 'high'

export interface Task {
  id: string
  title: string
  note: string
  projectId: string | null
  priority: TaskPriority
  dueDate: string
  dueTime: string
  location: string
  done: boolean
  createdAt: number
  completedAt: number | null
}

export interface TaskInput {
  title: string
  note?: string
  projectId?: string | null
  priority?: TaskPriority
  dueDate?: string
  dueTime?: string
  location?: string
}

export interface TaskPatch extends TaskInput {
  done?: boolean
}

export interface RecordCard {
  id: string
  date: string
  title: string
  category: string
  description: string
  color: string
  createdAt: number
  updatedAt: number
}

export interface RecordCardInput {
  date: string
  title: string
  category?: string
  description?: string
  color?: string
}

export type RecordCardPatch = Partial<RecordCardInput>

export interface Reflection {
  id: string
  date: string
  content: string
  mood: string
  updatedAt: number
}

export interface ReflectionInput {
  date: string
  content: string
  mood: string
}

export interface Note {
  id: string
  title: string
  content: string
  taskId: string | null
  createdAt: number
  updatedAt: number
}

export interface NoteInput {
  title: string
  content?: string
  taskId?: string | null
}

export type NotePatch = Partial<NoteInput>

export interface CaptureItem {
  id: string
  text: string
  createdAt: number
}

export interface Settings {
  accent: string
  autoLaunch: boolean
  backgroundBlur: boolean
  backgroundOpacity: number
  uiScale: number
  closeAction: CloseAction
  alwaysOnTop: boolean
  fixedPosition: boolean
  windowCorner: WindowCorner
  dataDir: string
}

export type SettingsPatch = Partial<
  Pick<
    Settings,
    | 'accent'
    | 'autoLaunch'
    | 'backgroundBlur'
    | 'backgroundOpacity'
    | 'uiScale'
    | 'closeAction'
    | 'alwaysOnTop'
    | 'fixedPosition'
    | 'windowCorner'
  >
>

export interface Snapshot {
  projects: Project[]
  progress: ProgressEntry[]
  tasks: Task[]
  recordCards: RecordCard[]
  reflections: Reflection[]
  notes: Note[]
  captures: CaptureItem[]
  settings: Settings
}

export interface SmartPlannerApi {
  getSnapshot: () => Promise<Snapshot>
  createProject: (input: ProjectInput) => Promise<Project | null>
  updateProject: (id: string, patch: Partial<ProjectInput>) => Promise<Project | null>
  deleteProject: (id: string) => Promise<void>
  addProgress: (input: ProgressInput) => Promise<ProgressEntry | null>
  deleteProgress: (id: string) => Promise<void>
  createTask: (input: TaskInput) => Promise<Task | null>
  updateTask: (id: string, patch: Partial<TaskPatch>) => Promise<Task | null>
  deleteTask: (id: string) => Promise<void>
  createRecordCard: (input: RecordCardInput) => Promise<RecordCard | null>
  updateRecordCard: (
    id: string,
    patch: RecordCardPatch
  ) => Promise<RecordCard | null>
  deleteRecordCard: (id: string) => Promise<void>
  saveReflection: (input: ReflectionInput) => Promise<Reflection | null>
  createNote: (input: NoteInput) => Promise<Note | null>
  updateNote: (id: string, patch: NotePatch) => Promise<Note | null>
  deleteNote: (id: string) => Promise<void>
  saveCapture: (text: string) => Promise<CaptureItem | null>
  listCaptures: () => Promise<CaptureItem[]>
  updateSettings: (patch: SettingsPatch) => Promise<Settings>
  chooseDataDir: () => Promise<Snapshot | null>
  useDefaultDataDir: () => Promise<Snapshot | null>
  backupNow: () => Promise<string | null>
  openDataDir: () => Promise<void>
  exportData: () => Promise<string | null>
  openQuickCapture: () => void
  hideQuickCapture: () => void
  controlWindow: (action: WindowAction) => void
  onCapture: (callback: (item: CaptureItem) => void) => () => void
  platform: string
}
