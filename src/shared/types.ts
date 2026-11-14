export type ProjectStatus = 'active' | 'paused' | 'done'

export type WindowCorner =
  | 'center'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'

export type WindowAction = 'minimize' | 'toggle-maximize' | 'close'

export type CloseAction = 'ask' | 'tray' | 'quit'

export type StickyModule = 'tasks' | 'projects' | 'checkin' | 'courses'

export type StickyEditorType = 'task' | 'project' | 'checkin' | 'course'

export type StickyLayer = 'top' | 'bottom'

export interface StickyStatus {
  mode: 'desktop' | 'fallback'
  message?: string
}

export type AnniversaryRepeat = 'yearly' | 'once'

export type AnniversaryCalendar = 'solar' | 'lunar'

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

export type CoursePlanStatus = 'considering' | 'selected' | 'dropped'

export type CourseSemester = 'fall' | 'spring'

export type CheckinPeriod = 'week' | 'month' | 'year'

export type CleanupKind =
  | 'completedTasks'
  | 'pastReflections'
  | 'expiredAnniversaries'

export interface Project {
  id: string
  name: string
  description: string
  color: string
  status: ProjectStatus
  startDate: string
  targetDate: string
  sortOrder: number
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

export interface Anniversary {
  id: string
  title: string
  date: string
  calendar: AnniversaryCalendar
  lunarLeap: boolean
  repeat: AnniversaryRepeat
  note: string
  color: string
  createdAt: number
  updatedAt: number
}

export interface AnniversaryInput {
  title: string
  date: string
  calendar?: AnniversaryCalendar
  lunarLeap?: boolean
  repeat?: AnniversaryRepeat
  note?: string
  color?: string
}

export type AnniversaryPatch = Partial<AnniversaryInput>

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

export interface CourseSlot {
  weekday: Weekday
  startTime: string
  endTime: string
}

export interface Course {
  id: string
  name: string
  teacher: string
  location: string
  weekday: Weekday
  startTime: string
  endTime: string
  slots: CourseSlot[]
  weeks: string
  color: string
  note: string
  createdAt: number
  updatedAt: number
}

export interface CourseInput {
  name: string
  teacher?: string
  location?: string
  weekday?: Weekday
  startTime?: string
  endTime?: string
  slots?: CourseSlot[]
  weeks?: string
  color?: string
  note?: string
}

export type CoursePatch = Partial<CourseInput>

export interface CoursePlan {
  id: string
  name: string
  teacher: string
  location: string
  weekday: Weekday
  startTime: string
  endTime: string
  slots: CourseSlot[]
  weeks: string
  semester: CourseSemester
  status: CoursePlanStatus
  credits: number
  categoryId: string | null
  note: string
  color: string
  createdAt: number
  updatedAt: number
}

export interface CoursePlanInput {
  name: string
  teacher?: string
  location?: string
  weekday?: Weekday
  startTime?: string
  endTime?: string
  slots?: CourseSlot[]
  weeks?: string
  semester?: CourseSemester
  status?: CoursePlanStatus
  credits?: number
  categoryId?: string | null
  note?: string
  color?: string
}

export interface CreditCategory {
  id: string
  name: string
  earned: number
  required: number
  planned: number
  note: string
  createdAt: number
  updatedAt: number
}

export interface CreditCategoryInput {
  name: string
  earned?: number
  required?: number
  planned?: number
  note?: string
}

export type CoursePlanPatch = Partial<CoursePlanInput>

export interface Checkin {
  id: string
  name: string
  color: string
  targetDays: number
  period: CheckinPeriod
  note: string
  createdAt: number
  updatedAt: number
}

export interface CheckinInput {
  name: string
  color?: string
  targetDays?: number
  period?: CheckinPeriod
  note?: string
}

export type CheckinPatch = Partial<CheckinInput>

export interface CheckinRecord {
  id: string
  checkinId: string
  date: string
  createdAt: number
}

export interface CleanupResult {
  removed: number
  snapshot: Snapshot
}

export interface LicenseStatus {
  activated: boolean
  machineCode: string
  label?: string
  issuedAt?: number
  version?: string
}

export interface ActivationResult {
  ok: boolean
  message: string
  status: LicenseStatus
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
  sidebarCollapsed: boolean
  stickyModules: StickyModule[]
  stickyLayer: StickyLayer
  autoCheckUpdate: boolean
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
    | 'sidebarCollapsed'
    | 'stickyModules'
    | 'stickyLayer'
    | 'autoCheckUpdate'
  >
>

export type UpdateState =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'not-available'
  | 'error'

export interface UpdateStatus {
  state: UpdateState
  version?: string
  percent?: number
  message?: string
  checkedAt?: number
}

export interface Snapshot {
  projects: Project[]
  progress: ProgressEntry[]
  tasks: Task[]
  recordCards: RecordCard[]
  anniversaries: Anniversary[]
  reflections: Reflection[]
  notes: Note[]
  captures: CaptureItem[]
  courses: Course[]
  coursePlans: CoursePlan[]
  checkins: Checkin[]
  checkinRecords: CheckinRecord[]
  creditCategories: CreditCategory[]
  settings: Settings
  license: LicenseStatus
  version: string
}

export interface SmartPlannerApi {
  getSnapshot: () => Promise<Snapshot>
  createProject: (input: ProjectInput) => Promise<Project | null>
  updateProject: (id: string, patch: Partial<ProjectInput>) => Promise<Project | null>
  reorderProjects: (ids: string[]) => Promise<void>
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
  createAnniversary: (input: AnniversaryInput) => Promise<Anniversary | null>
  updateAnniversary: (
    id: string,
    patch: AnniversaryPatch
  ) => Promise<Anniversary | null>
  deleteAnniversary: (id: string) => Promise<void>
  saveReflection: (input: ReflectionInput) => Promise<Reflection | null>
  createNote: (input: NoteInput) => Promise<Note | null>
  updateNote: (id: string, patch: NotePatch) => Promise<Note | null>
  deleteNote: (id: string) => Promise<void>
  saveCapture: (text: string) => Promise<CaptureItem | null>
  deleteCapture: (id: string) => Promise<void>
  listCaptures: () => Promise<CaptureItem[]>
  createCourse: (input: CourseInput) => Promise<Course | null>
  updateCourse: (id: string, patch: CoursePatch) => Promise<Course | null>
  deleteCourse: (id: string) => Promise<void>
  createCoursePlan: (input: CoursePlanInput) => Promise<CoursePlan | null>
  updateCoursePlan: (
    id: string,
    patch: CoursePlanPatch
  ) => Promise<CoursePlan | null>
  deleteCoursePlan: (id: string) => Promise<void>
  promoteCoursePlan: (
    id: string
  ) => Promise<{ course: Course; plan: CoursePlan } | null>
  createCheckin: (input: CheckinInput) => Promise<Checkin | null>
  updateCheckin: (id: string, patch: CheckinPatch) => Promise<Checkin | null>
  deleteCheckin: (id: string) => Promise<void>
  toggleCheckin: (
    checkinId: string,
    date: string
  ) => Promise<{ checked: boolean; record: CheckinRecord | null } | null>
  createCreditCategory: (
    input: CreditCategoryInput
  ) => Promise<CreditCategory | null>
  updateCreditCategory: (
    id: string,
    patch: Partial<CreditCategoryInput>
  ) => Promise<CreditCategory | null>
  deleteCreditCategory: (id: string) => Promise<void>
  cleanupData: (kind: CleanupKind) => Promise<CleanupResult>
  getLicenseStatus: () => Promise<LicenseStatus>
  activateLicense: (code: string) => Promise<ActivationResult>
  quitApp: () => void
  copyText: (text: string) => Promise<void>
  openSticky: () => void
  closeSticky: () => void
  openEditor: (type: StickyEditorType, id?: string) => void
  closeEditor: () => void
  getStickyStatus: () => Promise<StickyStatus>
  retryStickyDesktop: () => Promise<StickyStatus>
  onStickyStatus: (callback: (status: StickyStatus) => void) => () => void
  focusSticky: () => void
  startStickyDrag: () => void
  endStickyDrag: () => void
  openMain: (module?: string) => void
  onDataChanged: (callback: () => void) => () => void
  updateSettings: (patch: SettingsPatch) => Promise<Settings>
  chooseDataDir: () => Promise<Snapshot | null>
  useDefaultDataDir: () => Promise<Snapshot | null>
  backupNow: () => Promise<string | null>
  openDataDir: () => Promise<void>
  exportData: () => Promise<string | null>
  openQuickCapture: () => void
  hideQuickCapture: () => void
  controlWindow: (action: WindowAction) => void
  checkForUpdates: () => Promise<UpdateStatus>
  installUpdate: () => void
  onCapture: (callback: (item: CaptureItem) => void) => () => void
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => () => void
  onNavigate: (callback: (key: string) => void) => () => void
  platform: string
}
