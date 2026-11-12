import { contextBridge, ipcRenderer } from 'electron'
import type {
  ActivationResult,
  Anniversary,
  AnniversaryInput,
  AnniversaryPatch,
  CaptureItem,
  Checkin,
  CheckinInput,
  CheckinPatch,
  CheckinRecord,
  CleanupKind,
  CleanupResult,
  Course,
  CourseInput,
  CoursePatch,
  CoursePlan,
  CoursePlanInput,
  CoursePlanPatch,
  EdgeSide,
  LicenseStatus,
  Note,
  NoteInput,
  NotePatch,
  Project,
  ProjectInput,
  ProgressEntry,
  ProgressInput,
  RecordCard,
  RecordCardInput,
  RecordCardPatch,
  Reflection,
  ReflectionInput,
  Settings,
  SettingsPatch,
  SmartPlannerApi,
  Snapshot,
  Task,
  TaskInput,
  TaskPatch,
  UpdateStatus,
  WindowAction
} from '../shared/types'

const api: SmartPlannerApi = {
  getSnapshot: (): Promise<Snapshot> => ipcRenderer.invoke('data:snapshot'),
  createProject: (input: ProjectInput): Promise<Project | null> =>
    ipcRenderer.invoke('project:create', input),
  updateProject: (id: string, patch: Partial<ProjectInput>): Promise<Project | null> =>
    ipcRenderer.invoke('project:update', id, patch),
  reorderProjects: (ids: string[]): Promise<void> =>
    ipcRenderer.invoke('project:reorder', ids),
  deleteProject: (id: string): Promise<void> => ipcRenderer.invoke('project:delete', id),
  addProgress: (input: ProgressInput): Promise<ProgressEntry | null> =>
    ipcRenderer.invoke('progress:add', input),
  deleteProgress: (id: string): Promise<void> => ipcRenderer.invoke('progress:delete', id),
  createTask: (input: TaskInput): Promise<Task | null> =>
    ipcRenderer.invoke('task:create', input),
  updateTask: (id: string, patch: Partial<TaskPatch>): Promise<Task | null> =>
    ipcRenderer.invoke('task:update', id, patch),
  deleteTask: (id: string): Promise<void> => ipcRenderer.invoke('task:delete', id),
  createRecordCard: (input: RecordCardInput): Promise<RecordCard | null> =>
    ipcRenderer.invoke('record:create', input),
  updateRecordCard: (
    id: string,
    patch: RecordCardPatch
  ): Promise<RecordCard | null> => ipcRenderer.invoke('record:update', id, patch),
  deleteRecordCard: (id: string): Promise<void> =>
    ipcRenderer.invoke('record:delete', id),
  createAnniversary: (input: AnniversaryInput): Promise<Anniversary | null> =>
    ipcRenderer.invoke('anniversary:create', input),
  updateAnniversary: (
    id: string,
    patch: AnniversaryPatch
  ): Promise<Anniversary | null> => ipcRenderer.invoke('anniversary:update', id, patch),
  deleteAnniversary: (id: string): Promise<void> =>
    ipcRenderer.invoke('anniversary:delete', id),
  saveReflection: (input: ReflectionInput): Promise<Reflection | null> =>
    ipcRenderer.invoke('reflection:save', input),
  createNote: (input: NoteInput): Promise<Note | null> =>
    ipcRenderer.invoke('note:create', input),
  updateNote: (id: string, patch: NotePatch): Promise<Note | null> =>
    ipcRenderer.invoke('note:update', id, patch),
  deleteNote: (id: string): Promise<void> => ipcRenderer.invoke('note:delete', id),
  saveCapture: (text: string): Promise<CaptureItem | null> =>
    ipcRenderer.invoke('capture:save', text),
  deleteCapture: (id: string): Promise<void> => ipcRenderer.invoke('capture:delete', id),
  listCaptures: (): Promise<CaptureItem[]> => ipcRenderer.invoke('capture:list'),
  createCourse: (input: CourseInput): Promise<Course | null> =>
    ipcRenderer.invoke('course:create', input),
  updateCourse: (id: string, patch: CoursePatch): Promise<Course | null> =>
    ipcRenderer.invoke('course:update', id, patch),
  deleteCourse: (id: string): Promise<void> =>
    ipcRenderer.invoke('course:delete', id),
  createCoursePlan: (input: CoursePlanInput): Promise<CoursePlan | null> =>
    ipcRenderer.invoke('course-plan:create', input),
  updateCoursePlan: (
    id: string,
    patch: CoursePlanPatch
  ): Promise<CoursePlan | null> =>
    ipcRenderer.invoke('course-plan:update', id, patch),
  deleteCoursePlan: (id: string): Promise<void> =>
    ipcRenderer.invoke('course-plan:delete', id),
  promoteCoursePlan: (
    id: string
  ): Promise<{ course: Course; plan: CoursePlan } | null> =>
    ipcRenderer.invoke('course-plan:promote', id),
  createCheckin: (input: CheckinInput): Promise<Checkin | null> =>
    ipcRenderer.invoke('checkin:create', input),
  updateCheckin: (id: string, patch: CheckinPatch): Promise<Checkin | null> =>
    ipcRenderer.invoke('checkin:update', id, patch),
  deleteCheckin: (id: string): Promise<void> =>
    ipcRenderer.invoke('checkin:delete', id),
  toggleCheckin: (
    checkinId: string,
    date: string
  ): Promise<{ checked: boolean; record: CheckinRecord | null } | null> =>
    ipcRenderer.invoke('checkin:toggle', checkinId, date),
  cleanupData: (kind: CleanupKind): Promise<CleanupResult> =>
    ipcRenderer.invoke('data:cleanup', kind),
  getLicenseStatus: (): Promise<LicenseStatus> =>
    ipcRenderer.invoke('license:status'),
  activateLicense: (code: string): Promise<ActivationResult> =>
    ipcRenderer.invoke('license:activate', code),
  quitApp: (): void => ipcRenderer.send('license:quit'),
  copyText: (text: string): Promise<void> =>
    ipcRenderer.invoke('clipboard:write', text),
  updateSettings: (patch: SettingsPatch): Promise<Settings> =>
    ipcRenderer.invoke('settings:update', patch),
  chooseDataDir: (): Promise<Snapshot | null> => ipcRenderer.invoke('settings:chooseDataDir'),
  useDefaultDataDir: (): Promise<Snapshot | null> =>
    ipcRenderer.invoke('settings:useDefaultDataDir'),
  backupNow: (): Promise<string | null> => ipcRenderer.invoke('settings:backupNow'),
  openDataDir: (): Promise<void> => ipcRenderer.invoke('settings:openDataDir'),
  exportData: (): Promise<string | null> => ipcRenderer.invoke('settings:exportData'),
  openQuickCapture: (): void => ipcRenderer.send('quick:show'),
  hideQuickCapture: (): void => ipcRenderer.send('quick:hide'),
  controlWindow: (action: WindowAction): void =>
    ipcRenderer.send('window:control', action),
  setEdgeVisible: (visible: boolean): void =>
    ipcRenderer.send('window:edge', visible ? 'show' : 'hide'),
  activateEdge: (key: string): void => ipcRenderer.send('edge:activate', key),
  checkForUpdates: (): Promise<UpdateStatus> => ipcRenderer.invoke('update:check'),
  installUpdate: (): void => ipcRenderer.send('update:install'),
  onCapture: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, item: CaptureItem): void => {
      callback(item)
    }
    ipcRenderer.on('capture:new', listener)
    return () => {
      ipcRenderer.removeListener('capture:new', listener)
    }
  },
  onUpdateStatus: (callback) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      status: UpdateStatus
    ): void => {
      callback(status)
    }
    ipcRenderer.on('update:status', listener)
    return () => {
      ipcRenderer.removeListener('update:status', listener)
    }
  },
  onEdgeState: (callback) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      state: { hidden: boolean; side: EdgeSide }
    ): void => {
      callback(state)
    }
    ipcRenderer.on('window:edge-state', listener)
    return () => {
      ipcRenderer.removeListener('window:edge-state', listener)
    }
  },
  onNavigate: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, key: string): void => {
      callback(key)
    }
    ipcRenderer.on('navigate:module', listener)
    return () => {
      ipcRenderer.removeListener('navigate:module', listener)
    }
  },
  platform: process.platform
}

contextBridge.exposeInMainWorld('api', api)
