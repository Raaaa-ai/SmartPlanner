import {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  ipcMain,
  Menu,
  screen,
  shell,
  Tray
} from 'electron'
import { join, dirname } from 'node:path'
import { randomUUID } from 'node:crypto'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync
} from 'node:fs'
import trayIcon from '../../resources/tray.png?asset'
import type {
  CaptureItem,
  CloseAction,
  Note,
  NoteInput,
  NotePatch,
  Project,
  ProjectInput,
  ProjectStatus,
  ProgressEntry,
  ProgressInput,
  RecordCard,
  RecordCardInput,
  RecordCardPatch,
  Reflection,
  ReflectionInput,
  Settings,
  SettingsPatch,
  Snapshot,
  Task,
  TaskInput,
  TaskPatch,
  TaskPriority,
  WindowCorner
} from '../shared/types'

const APP_ID = 'com.smartplanner.app'
const QUICK_CAPTURE_SHORTCUT = 'CommandOrControl+Alt+Space'

app.commandLine.appendSwitch('enable-lcd-text')
app.commandLine.appendSwitch('high-dpi-support', '1')

const DEFAULT_ACCENT = '#8a6a3f'
const STATUSES: ProjectStatus[] = ['active', 'paused', 'done']
const PRIORITIES: TaskPriority[] = ['low', 'normal', 'high']
const CORNERS: WindowCorner[] = [
  'center',
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right'
]

interface AppConfig {
  dataDir?: string
  accent?: string
  autoLaunch?: boolean
  backgroundBlur?: boolean
  backgroundOpacity?: number
  closeAction?: CloseAction
  uiScale?: number
  alwaysOnTop?: boolean
  fixedPosition?: boolean
  windowCorner?: WindowCorner
  windowBounds?: { x: number; y: number; width: number; height: number }
}

interface StoreData {
  projects: Project[]
  progress: ProgressEntry[]
  tasks: Task[]
  recordCards: RecordCard[]
  reflections: Reflection[]
  notes: Note[]
  captures: CaptureItem[]
}

let mainWindow: BrowserWindow | null = null
let quickWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

let config: AppConfig = {}
let store: StoreData = {
  projects: [],
  progress: [],
  tasks: [],
  recordCards: [],
  reflections: [],
  notes: [],
  captures: []
}
let dataDir = ''
let dataFile = ''
let configFile = ''
let boundsTimer: NodeJS.Timeout | null = null
let programmaticMove = false
let closeDialogOpen = false

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as T
  } catch {
    return null
  }
}

function writeJson(file: string, value: unknown): void {
  mkdirSync(dirname(file), { recursive: true })
  const temp = `${file}.tmp`
  writeFileSync(temp, JSON.stringify(value, null, 2), 'utf8')
  renameSync(temp, file)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function toISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function todayISO(): string {
  return toISODate(new Date())
}

function normalizeDate(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback
}

function normalizeTime(value: unknown): string {
  return typeof value === 'string' && /^\d{2}:\d{2}$/.test(value) ? value : ''
}

function normalizeStore(raw: unknown): StoreData {
  const data = raw as Partial<StoreData> | null
  return {
    projects: Array.isArray(data?.projects) ? data.projects : [],
    progress: Array.isArray(data?.progress) ? data.progress : [],
    tasks: Array.isArray(data?.tasks)
      ? data.tasks.map((task) => ({
          ...task,
          dueTime: typeof task.dueTime === 'string' ? task.dueTime : '',
          location: typeof task.location === 'string' ? task.location : ''
        }))
      : [],
    recordCards: Array.isArray(data?.recordCards) ? data.recordCards : [],
    reflections: Array.isArray(data?.reflections) ? data.reflections : [],
    notes: Array.isArray(data?.notes) ? data.notes : [],
    captures: Array.isArray(data?.captures) ? data.captures : []
  }
}

function currentSettings(): Settings {
  return {
    accent: typeof config.accent === 'string' ? config.accent : DEFAULT_ACCENT,
    autoLaunch: config.autoLaunch === true,
    backgroundBlur: config.backgroundBlur === true,
    backgroundOpacity: clamp(
      typeof config.backgroundOpacity === 'number' ? config.backgroundOpacity : 80,
      50,
      100
    ),
    uiScale: clamp(typeof config.uiScale === 'number' ? config.uiScale : 100, 90, 150),
    closeAction:
      config.closeAction === 'tray' || config.closeAction === 'quit'
        ? config.closeAction
        : 'ask',
    alwaysOnTop: config.alwaysOnTop === true,
    fixedPosition: config.fixedPosition === true,
    windowCorner: CORNERS.includes(config.windowCorner as WindowCorner)
      ? (config.windowCorner as WindowCorner)
      : 'center',
    dataDir
  }
}

function snapshot(): Snapshot {
  return {
    projects: store.projects,
    progress: store.progress,
    tasks: store.tasks,
    recordCards: store.recordCards,
    reflections: store.reflections,
    notes: store.notes,
    captures: store.captures,
    settings: currentSettings()
  }
}

function persistStore(): void {
  writeJson(dataFile, store)
}

function persistConfig(): void {
  writeJson(configFile, config)
}

function preferredDataDir(): string {
  if (process.platform === 'win32') {
    for (const drive of ['D:', 'E:', 'F:']) {
      try {
        if (existsSync(`${drive}\\`)) {
          return join(`${drive}\\`, 'SmartPlanner', 'data')
        }
      } catch {
      }
    }
  }
  return join(app.getPath('userData'), 'data')
}

function initStore(): void {
  const userDataDir = app.getPath('userData')
  configFile = join(userDataDir, 'config.json')
  config = readJson<AppConfig>(configFile) ?? {}

  const configured = typeof config.dataDir === 'string' ? config.dataDir : ''
  const fallbackDir = join(userDataDir, 'data')
  const preferredDir = preferredDataDir()
  const usePreferred =
    preferredDir !== fallbackDir && (!configured || configured === fallbackDir)
  dataDir = usePreferred ? preferredDir : configured || fallbackDir

  try {
    mkdirSync(dataDir, { recursive: true })
  } catch {
    dataDir = fallbackDir
    mkdirSync(dataDir, { recursive: true })
    config.dataDir = dataDir
  }

  if (usePreferred) {
    const target = join(dataDir, 'smartplanner.json')
    const oldFile = join(fallbackDir, 'smartplanner.json')
    try {
      if (dataDir !== fallbackDir && !existsSync(target) && existsSync(oldFile)) {
        copyFileSync(oldFile, target)
      }
    } catch {
    }
    config.dataDir = dataDir
    persistConfig()
  }

  dataFile = join(dataDir, 'smartplanner.json')
  store = normalizeStore(readJson<StoreData>(dataFile))
}


const BACKUP_LIMIT = 20

function backupDirPath(): string {
  return join(dataDir, 'backups')
}

function pruneBackups(): void {
  try {
    const dir = backupDirPath()
    const files = readdirSync(dir)
      .filter((name) => name.startsWith('smartplanner-') && name.endsWith('.json'))
      .map((name) => ({
        name,
        mtime: statSync(join(dir, name)).mtimeMs
      }))
      .sort((a, b) => a.mtime - b.mtime)

    while (files.length > BACKUP_LIMIT) {
      const oldest = files.shift()
      if (oldest) unlinkSync(join(dir, oldest.name))
    }
  } catch {
  }
}

function createBackup(kind: 'auto' | 'manual'): string | null {
  try {
    if (!existsSync(dataFile)) return null

    const dir = backupDirPath()
    mkdirSync(dir, { recursive: true })

    const fileName =
      kind === 'auto'
        ? `smartplanner-auto-${todayISO()}.json`
        : `smartplanner-manual-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    const target = join(dir, fileName)

    if (kind === 'auto' && existsSync(target)) return target

    copyFileSync(dataFile, target)
    pruneBackups()
    return target
  } catch {
    return null
  }
}

function ensureDailyBackup(): void {
  createBackup('auto')
}

function applyWindowSettings(win: BrowserWindow): void {
  const settings = currentSettings()

  try {
    win.setOpacity(1)
  } catch {
  }

  try {
    win.setBackgroundMaterial(settings.backgroundBlur ? 'acrylic' : 'none')
  } catch {
  }

  try {
    win.setBackgroundColor(
      settings.backgroundBlur ? '#00000000' : '#f6f7f9'
    )
  } catch {
  }

  try {
    win.setAlwaysOnTop(settings.alwaysOnTop, 'floating')
  } catch {
  }

  try {
    win.setMovable(!settings.fixedPosition)
  } catch {
  }

  try {
    win.webContents.setZoomFactor(settings.uiScale / 100)
  } catch {
  }
}

function placeWindow(win: BrowserWindow, corner: WindowCorner): void {
  programmaticMove = true
  const area = screen.getPrimaryDisplay().workArea
  const [width, height] = win.getSize()
  const margin = 24

  let x = Math.round(area.x + (area.width - width) / 2)
  let y = Math.round(area.y + (area.height - height) / 2)

  if (corner === 'top-left') {
    x = area.x + margin
    y = area.y + margin
  } else if (corner === 'top-right') {
    x = area.x + area.width - width - margin
    y = area.y + margin
  } else if (corner === 'bottom-left') {
    x = area.x + margin
    y = area.y + area.height - height - margin
  } else if (corner === 'bottom-right') {
    x = area.x + area.width - width - margin
    y = area.y + area.height - height - margin
  }

  win.setPosition(Math.round(x), Math.round(y))
  setTimeout(() => {
    programmaticMove = false
  }, 150)
}

function guardWindowMove(win: BrowserWindow): void {
  if (!currentSettings().fixedPosition) {
    scheduleBoundsSave(win)
    return
  }

  const bounds = config.windowBounds
  if (!bounds || programmaticMove) return

  const [x, y] = win.getPosition()
  if (x === bounds.x && y === bounds.y) return

  programmaticMove = true
  win.setPosition(bounds.x, bounds.y)
  setTimeout(() => {
    programmaticMove = false
  }, 150)
}

function boundsVisibleOnScreen(bounds: {
  x: number
  y: number
  width: number
  height: number
}): boolean {
  return screen.getAllDisplays().some((display) => {
    const area = display.workArea
    return !(
      bounds.x > area.x + area.width ||
      bounds.x + bounds.width < area.x ||
      bounds.y > area.y + area.height ||
      bounds.y + bounds.height < area.y
    )
  })
}

function scheduleBoundsSave(win: BrowserWindow): void {
  if (currentSettings().fixedPosition) return
  if (boundsTimer) clearTimeout(boundsTimer)

  boundsTimer = setTimeout(() => {
    if (win.isDestroyed() || win.isMinimized() || win.isMaximized()) return
    config.windowBounds = win.getBounds()
    persistConfig()
  }, 400)
}

function rendererUrl(hash?: string): string | null {
  const url = process.env['ELECTRON_RENDERER_URL']
  if (!url) return null
  return hash ? `${url}#${hash}` : url
}

function loadRenderer(win: BrowserWindow, hash?: string): void {
  const devUrl = rendererUrl(hash)
  if (devUrl) {
    void win.loadURL(devUrl)
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'), hash ? { hash } : undefined)
  }
}

function createMainWindow(): BrowserWindow {
  const settings = currentSettings()
  const saved = config.windowBounds
  const bounds =
    saved && boundsVisibleOnScreen(saved)
      ? saved
      : { width: 1160, height: 780 }

  const win = new BrowserWindow({
    ...bounds,
    minWidth: 920,
    minHeight: 640,
    show: false,
    frame: false,
    backgroundColor: '#f6f7f9',
    title: 'SmartPlanner',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      zoomFactor: 1
    }
  })

  win.webContents.setZoomFactor(1)
  void win.webContents.setVisualZoomLevelLimits(1, 1)
  applyWindowSettings(win)

  win.on('ready-to-show', () => win.show())
  win.on('move', () => guardWindowMove(win))
  win.on('resize', () => scheduleBoundsSave(win))

  win.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      void requestClose()
    }
  })

  win.on('closed', () => {
    mainWindow = null
  })

  if (settings.fixedPosition && (!saved || !boundsVisibleOnScreen(saved))) {
    win.once('show', () => placeWindow(win, currentSettings().windowCorner))
  }

  loadRenderer(win)
  return win
}

function showMainWindow(): void {
  if (!mainWindow) {
    mainWindow = createMainWindow()
    return
  }
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function toggleMainWindow(): void {
  if (mainWindow?.isVisible()) {
    mainWindow.hide()
  } else {
    showMainWindow()
  }
}

async function requestClose(): Promise<void> {
  if (!mainWindow || closeDialogOpen) return

  const action = currentSettings().closeAction
  if (action === 'tray') {
    mainWindow.hide()
    return
  }
  if (action === 'quit') {
    isQuitting = true
    app.quit()
    return
  }

  closeDialogOpen = true
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    buttons: ['最小化到托盘', '彻底退出', '取消'],
    defaultId: 0,
    cancelId: 2,
    title: '关闭 SmartPlanner',
    message: '要最小化到托盘继续后台运行，还是彻底退出？',
    detail: '选择「最小化到托盘」后应用会继续在后台运行，可从托盘图标重新打开。',
    checkboxLabel: '记住我的选择',
    checkboxChecked: false
  })
  closeDialogOpen = false

  if (result.response === 2) return

  if (result.checkboxChecked) {
    config.closeAction = result.response === 0 ? 'tray' : 'quit'
    persistConfig()
  }

  if (result.response === 0) {
    mainWindow?.hide()
  } else if (result.response === 1) {
    isQuitting = true
    app.quit()
  }
}

function createQuickWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 580,
    height: 168,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  win.setAlwaysOnTop(true, 'floating')

  win.on('blur', () => {
    if (!win.isDestroyed()) win.hide()
  })

  win.on('closed', () => {
    quickWindow = null
  })

  loadRenderer(win, 'quick')
  return win
}

function positionQuickWindow(win: BrowserWindow): void {
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
  const area = display.workArea
  const [width, height] = win.getSize()
  win.setPosition(
    Math.round(area.x + (area.width - width) / 2),
    Math.round(area.y + area.height * 0.18 - height / 2)
  )
}

function showQuickCapture(): void {
  if (!quickWindow) quickWindow = createQuickWindow()
  positionQuickWindow(quickWindow)
  quickWindow.show()
  quickWindow.focus()
}

function hideQuickCapture(): void {
  quickWindow?.hide()
}

function toggleQuickCapture(): void {
  if (quickWindow?.isVisible()) {
    hideQuickCapture()
  } else {
    showQuickCapture()
  }
}

function createTray(): void {
  tray = new Tray(trayIcon)
  tray.setToolTip('SmartPlanner 个人工作台')

  const menu = Menu.buildFromTemplate([
    { label: '打开工作台', click: showMainWindow },
    { label: '快速记录', accelerator: 'Ctrl+Alt+Space', click: showQuickCapture },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setContextMenu(menu)
  tray.on('click', toggleMainWindow)
}

function sanitizeProjectInput(input: ProjectInput): ProjectInput | null {
  if (!input || typeof input.name !== 'string' || !input.name.trim()) return null

  return {
    name: input.name.trim().slice(0, 120),
    description: typeof input.description === 'string' ? input.description.slice(0, 2000) : '',
    color:
      typeof input.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(input.color)
        ? input.color
        : DEFAULT_ACCENT,
    status: STATUSES.includes(input.status as ProjectStatus)
      ? (input.status as ProjectStatus)
      : 'active',
    startDate: normalizeDate(input.startDate, todayISO()),
    targetDate: normalizeDate(input.targetDate, '')
  }
}

function registerIpc(): void {
  ipcMain.handle('data:snapshot', () => snapshot())

  ipcMain.handle('project:create', (_event, raw: ProjectInput) => {
    const input = sanitizeProjectInput(raw)
    if (!input) return null

    const now = Date.now()
    const project: Project = {
      id: randomUUID(),
      name: input.name,
      description: input.description ?? '',
      color: input.color ?? DEFAULT_ACCENT,
      status: input.status ?? 'active',
      startDate: input.startDate ?? todayISO(),
      targetDate: input.targetDate ?? '',
      createdAt: now,
      updatedAt: now
    }

    store.projects.unshift(project)
    persistStore()
    return project
  })

  ipcMain.handle('project:update', (_event, id: string, patch: Partial<ProjectInput>) => {
    const project = store.projects.find((item) => item.id === id)
    if (!project || !patch || typeof patch !== 'object') return null

    if (typeof patch.name === 'string' && patch.name.trim()) {
      project.name = patch.name.trim().slice(0, 120)
    }
    if (typeof patch.description === 'string') {
      project.description = patch.description.slice(0, 2000)
    }
    if (typeof patch.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(patch.color)) {
      project.color = patch.color
    }
    if (STATUSES.includes(patch.status as ProjectStatus)) {
      project.status = patch.status as ProjectStatus
    }
    if (typeof patch.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(patch.startDate)) {
      project.startDate = patch.startDate
    }
    if (
      typeof patch.targetDate === 'string' &&
      (patch.targetDate === '' || /^\d{4}-\d{2}-\d{2}$/.test(patch.targetDate))
    ) {
      project.targetDate = patch.targetDate
    }

    project.updatedAt = Date.now()
    persistStore()
    return project
  })

  ipcMain.handle('project:delete', (_event, id: string) => {
    const before = store.projects.length
    store.projects = store.projects.filter((project) => project.id !== id)
    store.progress = store.progress.filter((entry) => entry.projectId !== id)
    store.tasks = store.tasks.map((task) =>
      task.projectId === id ? { ...task, projectId: null } : task
    )
    if (store.projects.length !== before) persistStore()
  })

  ipcMain.handle('progress:add', (_event, raw: ProgressInput) => {
    if (!raw || typeof raw !== 'object') return null

    const project = store.projects.find((item) => item.id === raw.projectId)
    if (!project) return null
    if (typeof raw.content !== 'string' || !raw.content.trim()) return null

    const percent = clamp(Number(raw.percent), 0, 100)
    const entry: ProgressEntry = {
      id: randomUUID(),
      projectId: project.id,
      date: normalizeDate(raw.date, todayISO()),
      content: raw.content.trim().slice(0, 1000),
      percent: Number.isFinite(percent) ? Math.round(percent) : 0,
      createdAt: Date.now()
    }

    store.progress.push(entry)
    project.updatedAt = Date.now()
    persistStore()
    return entry
  })

  ipcMain.handle('progress:delete', (_event, id: string) => {
    const before = store.progress.length
    store.progress = store.progress.filter((entry) => entry.id !== id)
    if (store.progress.length !== before) persistStore()
  })

  ipcMain.handle('task:create', (_event, raw: TaskInput) => {
    if (!raw || typeof raw.title !== 'string' || !raw.title.trim()) return null

    const projectId =
      typeof raw.projectId === 'string' &&
      store.projects.some((project) => project.id === raw.projectId)
        ? raw.projectId
        : null
    const priority = PRIORITIES.includes(raw.priority as TaskPriority)
      ? (raw.priority as TaskPriority)
      : 'normal'

    const task: Task = {
      id: randomUUID(),
      title: raw.title.trim().slice(0, 300),
      note: typeof raw.note === 'string' ? raw.note.slice(0, 2000) : '',
      projectId,
      priority,
      dueDate: normalizeDate(raw.dueDate, ''),
      dueTime: normalizeTime(raw.dueTime),
      location:
        typeof raw.location === 'string' ? raw.location.trim().slice(0, 200) : '',
      done: false,
      createdAt: Date.now(),
      completedAt: null
    }

    store.tasks.unshift(task)
    persistStore()
    return task
  })

  ipcMain.handle('task:update', (_event, id: string, patch: Partial<TaskPatch>) => {
    const task = store.tasks.find((item) => item.id === id)
    if (!task || !patch || typeof patch !== 'object') return null

    if (typeof patch.title === 'string' && patch.title.trim()) {
      task.title = patch.title.trim().slice(0, 300)
    }
    if (typeof patch.note === 'string') {
      task.note = patch.note.slice(0, 2000)
    }
    if (patch.projectId === null) {
      task.projectId = null
    } else if (
      typeof patch.projectId === 'string' &&
      store.projects.some((project) => project.id === patch.projectId)
    ) {
      task.projectId = patch.projectId
    }
    if (PRIORITIES.includes(patch.priority as TaskPriority)) {
      task.priority = patch.priority as TaskPriority
    }
    if (
      typeof patch.dueDate === 'string' &&
      (patch.dueDate === '' || /^\d{4}-\d{2}-\d{2}$/.test(patch.dueDate))
    ) {
      task.dueDate = patch.dueDate
    }
    if (typeof patch.dueTime === 'string') {
      task.dueTime = normalizeTime(patch.dueTime)
    }
    if (typeof patch.location === 'string') {
      task.location = patch.location.trim().slice(0, 200)
    }
    if (typeof patch.done === 'boolean') {
      task.done = patch.done
      task.completedAt = patch.done ? Date.now() : null
    }

    persistStore()
    return task
  })

  ipcMain.handle('task:delete', (_event, id: string) => {
    const before = store.tasks.length
    store.tasks = store.tasks.filter((task) => task.id !== id)
    store.notes = store.notes.map((note) =>
      note.taskId === id ? { ...note, taskId: null } : note
    )
    if (store.tasks.length !== before) persistStore()
  })

  ipcMain.handle('record:create', (_event, raw: RecordCardInput) => {
    if (!raw || typeof raw.title !== 'string' || !raw.title.trim()) return null

    const now = Date.now()
    const card: RecordCard = {
      id: randomUUID(),
      date: normalizeDate(raw.date, todayISO()),
      title: raw.title.trim().slice(0, 200),
      category:
        typeof raw.category === 'string' && raw.category.trim()
          ? raw.category.trim().slice(0, 50)
          : '记录',
      description:
        typeof raw.description === 'string' ? raw.description.slice(0, 2000) : '',
      color:
        typeof raw.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(raw.color)
          ? raw.color
          : DEFAULT_ACCENT,
      createdAt: now,
      updatedAt: now
    }

    store.recordCards.unshift(card)
    persistStore()
    return card
  })

  ipcMain.handle('record:update', (_event, id: string, patch: RecordCardPatch) => {
    const card = store.recordCards.find((item) => item.id === id)
    if (!card || !patch || typeof patch !== 'object') return null

    if (typeof patch.title === 'string' && patch.title.trim()) {
      card.title = patch.title.trim().slice(0, 200)
    }
    if (typeof patch.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(patch.date)) {
      card.date = patch.date
    }
    if (typeof patch.category === 'string' && patch.category.trim()) {
      card.category = patch.category.trim().slice(0, 50)
    }
    if (typeof patch.description === 'string') {
      card.description = patch.description.slice(0, 2000)
    }
    if (typeof patch.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(patch.color)) {
      card.color = patch.color
    }

    card.updatedAt = Date.now()
    persistStore()
    return card
  })

  ipcMain.handle('record:delete', (_event, id: string) => {
    const before = store.recordCards.length
    store.recordCards = store.recordCards.filter((card) => card.id !== id)
    if (store.recordCards.length !== before) persistStore()
  })

  ipcMain.handle('reflection:save', (_event, raw: ReflectionInput) => {
    if (!raw || typeof raw.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.date)) {
      return null
    }

    const content = typeof raw.content === 'string' ? raw.content.slice(0, 20000) : ''
    const mood = typeof raw.mood === 'string' ? raw.mood.slice(0, 20) : ''
    const existing = store.reflections.find((item) => item.date === raw.date)

    if (!content.trim() && !mood) {
      if (existing) {
        store.reflections = store.reflections.filter((item) => item.date !== raw.date)
        persistStore()
      }
      return null
    }

    if (existing) {
      existing.content = content
      existing.mood = mood
      existing.updatedAt = Date.now()
      persistStore()
      return existing
    }

    const reflection: Reflection = {
      id: randomUUID(),
      date: raw.date,
      content,
      mood,
      updatedAt: Date.now()
    }
    store.reflections.push(reflection)
    persistStore()
    return reflection
  })

  ipcMain.handle('note:create', (_event, raw: NoteInput) => {
    const now = Date.now()
    const taskId =
      typeof raw?.taskId === 'string' &&
      store.tasks.some((task) => task.id === raw.taskId)
        ? raw.taskId
        : null

    const note: Note = {
      id: randomUUID(),
      title:
        typeof raw?.title === 'string' && raw.title.trim()
          ? raw.title.trim().slice(0, 200)
          : '无标题',
      content: typeof raw?.content === 'string' ? raw.content.slice(0, 50000) : '',
      taskId,
      createdAt: now,
      updatedAt: now
    }

    store.notes.unshift(note)
    persistStore()
    return note
  })

  ipcMain.handle('note:update', (_event, id: string, patch: NotePatch) => {
    const note = store.notes.find((item) => item.id === id)
    if (!note || !patch || typeof patch !== 'object') return null

    if (typeof patch.title === 'string') {
      note.title = patch.title.trim().slice(0, 200) || '无标题'
    }
    if (typeof patch.content === 'string') {
      note.content = patch.content.slice(0, 50000)
    }
    if (patch.taskId === null) {
      note.taskId = null
    } else if (
      typeof patch.taskId === 'string' &&
      store.tasks.some((task) => task.id === patch.taskId)
    ) {
      note.taskId = patch.taskId
    }

    note.updatedAt = Date.now()
    persistStore()
    return note
  })

  ipcMain.handle('note:delete', (_event, id: string) => {
    const before = store.notes.length
    store.notes = store.notes.filter((note) => note.id !== id)
    if (store.notes.length !== before) persistStore()
  })

  ipcMain.handle('capture:save', (_event, text: unknown) => {
    if (typeof text !== 'string') return null
    const trimmed = text.trim()
    if (!trimmed) return null

    const item: CaptureItem = {
      id: randomUUID(),
      text: trimmed,
      createdAt: Date.now()
    }
    store.captures.unshift(item)
    persistStore()

    mainWindow?.webContents.send('capture:new', item)
    return item
  })

  ipcMain.handle('capture:list', () => store.captures)

  ipcMain.handle('settings:update', (_event, patch: SettingsPatch) => {
    const previous = currentSettings()

    if (patch && typeof patch === 'object') {
      if (typeof patch.accent === 'string' && /^#[0-9a-fA-F]{6}$/.test(patch.accent)) {
        config.accent = patch.accent
      }
      if (typeof patch.autoLaunch === 'boolean') {
        config.autoLaunch = patch.autoLaunch
        try {
          app.setLoginItemSettings({ openAtLogin: patch.autoLaunch })
        } catch {
              }
      }
      if (typeof patch.backgroundBlur === 'boolean') {
        config.backgroundBlur = patch.backgroundBlur
      }
      if (
        typeof patch.backgroundOpacity === 'number' &&
        Number.isFinite(patch.backgroundOpacity)
      ) {
        config.backgroundOpacity = clamp(
          Math.round(patch.backgroundOpacity),
          50,
          100
        )
      }
      if (
        patch.closeAction === 'ask' ||
        patch.closeAction === 'tray' ||
        patch.closeAction === 'quit'
      ) {
        config.closeAction = patch.closeAction
      }
      if (typeof patch.uiScale === 'number' && Number.isFinite(patch.uiScale)) {
        config.uiScale = clamp(Math.round(patch.uiScale), 90, 150)
      }
      if (typeof patch.alwaysOnTop === 'boolean') {
        config.alwaysOnTop = patch.alwaysOnTop
      }
      if (typeof patch.fixedPosition === 'boolean') {
        config.fixedPosition = patch.fixedPosition
      }
      if (CORNERS.includes(patch.windowCorner as WindowCorner)) {
        config.windowCorner = patch.windowCorner as WindowCorner
      }
    }

    persistConfig()

    if (mainWindow) {
      const next = currentSettings()
      applyWindowSettings(mainWindow)

      if (next.fixedPosition) {
        if (patch?.windowCorner && next.windowCorner !== previous.windowCorner) {
          placeWindow(mainWindow, next.windowCorner)
          config.windowBounds = mainWindow.getBounds()
          persistConfig()
        } else if (!previous.fixedPosition) {
          config.windowBounds = mainWindow.getBounds()
          persistConfig()
        }
      }
    }

    return currentSettings()
  })

  ipcMain.handle('settings:chooseDataDir', async () => {
    const options: Electron.OpenDialogOptions = {
      title: '选择数据存储文件夹',
      properties: ['openDirectory', 'createDirectory']
    }
    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, options)
      : await dialog.showOpenDialog(options)

    if (result.canceled || !result.filePaths[0]) return null

    const chosen = result.filePaths[0]
    mkdirSync(chosen, { recursive: true })
    const target = join(chosen, 'smartplanner.json')

    if (target !== dataFile) {
      persistStore()

      const existing = readJson<StoreData>(target)
      if (existing) {
        store = normalizeStore(existing)
      } else {
        copyFileSync(dataFile, target)
      }

      dataDir = chosen
      dataFile = target
      config.dataDir = chosen
      persistConfig()
      ensureDailyBackup()
    }

    return snapshot()
  })

  ipcMain.handle('settings:useDefaultDataDir', async () => {
    const preferred = preferredDataDir()
    if (preferred === dataDir) return snapshot()

    mkdirSync(preferred, { recursive: true })
    persistStore()

    const target = join(preferred, 'smartplanner.json')
    if (existsSync(target)) {
      store = normalizeStore(readJson<StoreData>(target))
    } else {
      copyFileSync(dataFile, target)
    }

    dataDir = preferred
    dataFile = target
    config.dataDir = preferred
    persistConfig()
    ensureDailyBackup()
    return snapshot()
  })

  ipcMain.handle('settings:backupNow', () => createBackup('manual'))

  ipcMain.handle('settings:openDataDir', async () => {
    await shell.openPath(dataDir)
  })

  ipcMain.handle('settings:exportData', async () => {
    const options: Electron.SaveDialogOptions = {
      title: '导出数据备份',
      defaultPath: join(
        app.getPath('documents'),
        `smartplanner-backup-${todayISO()}.json`
      ),
      filters: [{ name: 'JSON', extensions: ['json'] }]
    }
    const result = mainWindow
      ? await dialog.showSaveDialog(mainWindow, options)
      : await dialog.showSaveDialog(options)

    if (result.canceled || !result.filePath) return null

    persistStore()
    copyFileSync(dataFile, result.filePath)
    return result.filePath
  })

  ipcMain.on('quick:show', showQuickCapture)
  ipcMain.on('quick:hide', hideQuickCapture)

  ipcMain.on('window:control', (_event, action: unknown) => {
    if (!mainWindow) return
    if (action === 'minimize') {
      mainWindow.minimize()
    } else if (action === 'toggle-maximize') {
      if (mainWindow.isMaximized()) mainWindow.unmaximize()
      else mainWindow.maximize()
    } else if (action === 'close') {
      void requestClose()
    }
  })
}

const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', showMainWindow)

  app.whenReady().then(() => {
    app.setAppUserModelId(APP_ID)

    initStore()
    ensureDailyBackup()
    registerIpc()
    createTray()
    mainWindow = createMainWindow()

    try {
      app.setLoginItemSettings({ openAtLogin: currentSettings().autoLaunch })
    } catch {
      }

    const registered = globalShortcut.register(
      QUICK_CAPTURE_SHORTCUT,
      toggleQuickCapture
    )
    if (!registered) {
      console.warn(`全局快捷键注册失败: ${QUICK_CAPTURE_SHORTCUT}`)
    }

    app.on('activate', showMainWindow)
  })

  app.on('before-quit', () => {
    isQuitting = true
  })

  app.on('will-quit', () => {
    globalShortcut.unregisterAll()
  })

  app.on('window-all-closed', () => {
  })
}
