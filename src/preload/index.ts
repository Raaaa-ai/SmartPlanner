import { contextBridge, ipcRenderer } from 'electron'
import type {
  CaptureItem,
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
  WindowAction
} from '../shared/types'

const api: SmartPlannerApi = {
  getSnapshot: (): Promise<Snapshot> => ipcRenderer.invoke('data:snapshot'),
  createProject: (input: ProjectInput): Promise<Project | null> =>
    ipcRenderer.invoke('project:create', input),
  updateProject: (id: string, patch: Partial<ProjectInput>): Promise<Project | null> =>
    ipcRenderer.invoke('project:update', id, patch),
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
  saveReflection: (input: ReflectionInput): Promise<Reflection | null> =>
    ipcRenderer.invoke('reflection:save', input),
  createNote: (input: NoteInput): Promise<Note | null> =>
    ipcRenderer.invoke('note:create', input),
  updateNote: (id: string, patch: NotePatch): Promise<Note | null> =>
    ipcRenderer.invoke('note:update', id, patch),
  deleteNote: (id: string): Promise<void> => ipcRenderer.invoke('note:delete', id),
  saveCapture: (text: string): Promise<CaptureItem | null> =>
    ipcRenderer.invoke('capture:save', text),
  listCaptures: (): Promise<CaptureItem[]> => ipcRenderer.invoke('capture:list'),
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
  onCapture: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, item: CaptureItem): void => {
      callback(item)
    }
    ipcRenderer.on('capture:new', listener)
    return () => {
      ipcRenderer.removeListener('capture:new', listener)
    }
  },
  platform: process.platform
}

contextBridge.exposeInMainWorld('api', api)
