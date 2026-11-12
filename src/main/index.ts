import {
  app,
  BrowserWindow,
  clipboard,
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
import {
  checkForUpdates,
  currentUpdateStatus,
  initUpdater,
  installUpdate
} from './updater'
import {
  getMachineCode,
  verifyLicenseCode,
  type LicensePayload
} from './license'
import type {
  ActivationResult,
  Anniversary,
  AnniversaryInput,
  AnniversaryPatch,
  AnniversaryRepeat,
  CaptureItem,
  Checkin,
  CheckinInput,
  CheckinPatch,
  CheckinPeriod,
  CheckinRecord,
  CleanupKind,
  CleanupResult,
  CloseAction,
  Course,
  CourseInput,
  CoursePatch,
  CoursePlan,
  CoursePlanInput,
  CoursePlanPatch,
  CoursePlanStatus,
  CourseSemester,
  EdgeSide,
  LicenseStatus,
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
  Weekday,
  WindowCorner
} from '../shared/types'

const APP_ID = 'com.smartplanner.app'
const QUICK_CAPTURE_SHORTCUT = 'CommandOrControl+Alt+Space'

app.commandLine.appendSwitch('enable-lcd-text')
app.commandLine.appendSwitch('high-dpi-support', '1')

const DEFAULT_ACCENT = '#8a6a3f'
const STATUSES: ProjectStatus[] = ['active', 'paused', 'done']
const PRIORITIES: TaskPriority[] = ['low', 'normal', 'high']
const PLAN_STATUSES: CoursePlanStatus[] = ['considering', 'selected', 'dropped']
const SEMESTERS: CourseSemester[] = ['fall', 'spring']
const CHECKIN_PERIODS: CheckinPeriod[] = ['week', 'month', 'year']
const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 7]
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
  sidebarCollapsed?: boolean
  edgeAutoHide?: boolean
  edgeSide?: EdgeSide
  autoCheckUpdate?: boolean
  windowBounds?: { x: number; y: number; width: number; height: number }
  license?: string
}

interface StoreData {
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
}

let mainWindow: BrowserWindow | null = null
let quickWindow: BrowserWindow | null = null
let edgeWindow: BrowserWindow | null = null
let activationWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false
let appStarted = false
let licenseInfo: LicensePayload | null = null

let config: AppConfig = {}
let store: StoreData = {
  projects: [],
  progress: [],
  tasks: [],
  recordCards: [],
  anniversaries: [],
  reflections: [],
  notes: [],
  captures: [],
  courses: [],
  coursePlans: [],
  checkins: [],
  checkinRecords: []
}
let dataDir = ''
let dataFile = ''
let configFile = ''
let boundsTimer: NodeJS.Timeout | null = null
let programmaticMove = false
let closeDialogOpen = false
let edgeHidden = false
let edgeHideTimer: NodeJS.Timeout | null = null
let edgeRestoreBounds: { x: number; y: number; width: number; height: number } | null =
  null
let updateTimer: NodeJS.Timeout | null = null

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
    projects: Array.isArray(data?.projects)
      ? data.projects.map((project, index) => ({
          ...project,
          sortOrder:
            typeof project.sortOrder === 'number' ? project.sortOrder : index
        }))
      : [],
    progress: Array.isArray(data?.progress) ? data.progress : [],
    tasks: Array.isArray(data?.tasks)
      ? data.tasks.map((task) => ({
          ...task,
          dueTime: typeof task.dueTime === 'string' ? task.dueTime : '',
          location: typeof task.location === 'string' ? task.location : ''
        }))
      : [],
    recordCards: Array.isArray(data?.recordCards) ? data.recordCards : [],
    anniversaries: Array.isArray(data?.anniversaries) ? data.anniversaries : [],
    reflections: Array.isArray(data?.reflections) ? data.reflections : [],
    notes: Array.isArray(data?.notes) ? data.notes : [],
    captures: Array.isArray(data?.captures) ? data.captures : [],
    courses: Array.isArray(data?.courses) ? data.courses : [],
    coursePlans: Array.isArray(data?.coursePlans)
      ? data.coursePlans.map((plan) => ({
          ...plan,
          semester: plan.semester === 'spring' ? 'spring' : 'fall'
        }))
      : [],
    checkins: Array.isArray(data?.checkins) ? data.checkins : [],
    checkinRecords: Array.isArray(data?.checkinRecords)
      ? data.checkinRecords
      : []
  }
}

function currentLicenseStatus(): LicenseStatus {
  return {
    activated: Boolean(licenseInfo),
    machineCode: getMachineCode(),
    label: licenseInfo?.label,
    issuedAt: licenseInfo?.iat,
    version: app.getVersion()
  }
}

function sortedProjects(): Project[] {
  return [...store.projects].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt
  )
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
    alwaysOnTop: config.edgeAutoHide === true ? false : config.alwaysOnTop === true,
    fixedPosition: config.fixedPosition === true,
    windowCorner: CORNERS.includes(config.windowCorner as WindowCorner)
      ? (config.windowCorner as WindowCorner)
      : 'center',
    sidebarCollapsed: config.sidebarCollapsed === true,
    edgeAutoHide: config.edgeAutoHide === true,
    edgeSide: 'right',
    autoCheckUpdate: config.autoCheckUpdate !== false,
    dataDir
  }
}

function snapshot(): Snapshot {
  return {
    projects: sortedProjects(),
    progress: store.progress,
    tasks: store.tasks,
    recordCards: store.recordCards,
    anniversaries: store.anniversaries,
    reflections: store.reflections,
    notes: store.notes,
    captures: store.captures,
    courses: [...store.courses].sort(
      (a, b) =>
        a.weekday - b.weekday ||
        a.startTime.localeCompare(b.startTime) ||
        a.createdAt - b.createdAt
    ),
    coursePlans: [...store.coursePlans].sort(
      (a, b) => b.createdAt - a.createdAt
    ),
    checkins: [...store.checkins].sort((a, b) => a.createdAt - b.createdAt),
    checkinRecords: store.checkinRecords,
    settings: currentSettings(),
    license: currentLicenseStatus(),
    version: app.getVersion()
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

function initConfig(): void {
  configFile = join(app.getPath('userData'), 'config.json')
  config = readJson<AppConfig>(configFile) ?? {}
}

function initStore(): void {
  const userDataDir = app.getPath('userData')
  initConfig()

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
  if (edgeHidden) return

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
  if (
    currentSettings().fixedPosition ||
    currentSettings().edgeAutoHide ||
    edgeHidden
  ) {
    return
  }
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

  try {
    win.webContents.setZoomFactor(1)
  } catch {
  }
  void win.webContents
    .setVisualZoomLevelLimits(1, 1)
    .catch(() => undefined)
  applyWindowSettings(win)

  win.on('ready-to-show', () => {
    win.show()
    edgeSendState()
    if (currentSettings().edgeAutoHide) {
      setTimeout(() => hideToEdge(), 800)
    }
  })
  win.webContents.on('did-finish-load', () => edgeSendState())
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

const EDGE_STRIP = 54

function edgeSendState(): void {
  mainWindow?.webContents.send('window:edge-state', {
    hidden: edgeHidden,
    side: currentSettings().edgeSide
  })
}

function cancelEdgeHide(): void {
  if (edgeHideTimer) {
    clearTimeout(edgeHideTimer)
    edgeHideTimer = null
  }
}

function edgeDockedBounds(): {
  x: number
  y: number
  width: number
  height: number
} {
  const base =
    edgeRestoreBounds ??
    config.windowBounds ??
    mainWindow?.getBounds() ?? { x: 0, y: 0, width: 1160, height: 780 }
  const area = screen.getDisplayMatching(base).workArea
  const y = Math.min(
    Math.max(base.y, area.y),
    area.y + area.height - base.height
  )
  return {
    x: area.x + area.width - base.width,
    y,
    width: base.width,
    height: base.height
  }
}

function showFromEdge(): void {
  if (!mainWindow) {
    showMainWindow()
    return
  }

  cancelEdgeHide()
  hideEdgeWindowBar()
  if (!edgeHidden) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
    return
  }

  programmaticMove = true
  mainWindow.setBounds(edgeDockedBounds())
  setTimeout(() => {
    programmaticMove = false
  }, 150)

  edgeHidden = false
  try {
    mainWindow.setFocusable(true)
    mainWindow.setAlwaysOnTop(false)
  } catch {
  }
  mainWindow.show()
  mainWindow.focus()
  edgeSendState()
}

function restoreFromEdge(): void {
  if (!mainWindow) return
  cancelEdgeHide()
  hideEdgeWindowBar()
  edgeHidden = false

  const restore = edgeRestoreBounds
  if (restore && boundsVisibleOnScreen(restore)) {
    programmaticMove = true
    mainWindow.setBounds(restore)
    config.windowBounds = restore
    persistConfig()
    setTimeout(() => {
      programmaticMove = false
    }, 150)
  }

  edgeRestoreBounds = null
  try {
    mainWindow.setFocusable(true)
    mainWindow.setAlwaysOnTop(currentSettings().alwaysOnTop, 'floating')
  } catch {
  }
  edgeSendState()
}

function hideToEdge(): void {
  if (!mainWindow || !currentSettings().edgeAutoHide) return
  cancelEdgeHide()
  if (edgeHidden) return

  const bounds = mainWindow.getBounds()
  if (bounds.width <= 0) return

  if (!edgeRestoreBounds) {
    edgeRestoreBounds = bounds
    config.windowBounds = bounds
  }

  const base = edgeRestoreBounds
  const area = screen.getDisplayMatching(base).workArea
  const y = Math.min(
    Math.max(base.y, area.y),
    area.y + area.height - base.height
  )
  const x = area.x + area.width - EDGE_STRIP

  programmaticMove = true
  try {
    mainWindow.setFocusable(false)
    mainWindow.setAlwaysOnTop(false)
    mainWindow.blur()
  } catch {
  }
  mainWindow.setPosition(Math.round(x), Math.round(y))
  edgeHidden = true
  persistConfig()
  showEdgeWindow()
  setTimeout(() => {
    programmaticMove = false
    edgeSendState()
  }, 150)
}

function scheduleEdgeHide(): void {
  if (!currentSettings().edgeAutoHide || closeDialogOpen) return
  cancelEdgeHide()
  edgeHideTimer = setTimeout(() => {
    edgeHideTimer = null
    hideToEdge()
  }, 450)
}

function applyEdgeBehavior(previous: Settings, next: Settings): void {
  if (!mainWindow) return

  if (next.edgeAutoHide) {
    if (!previous.edgeAutoHide) {
      setTimeout(() => hideToEdge(), 200)
    } else if (previous.edgeSide !== next.edgeSide) {
      if (edgeHidden) {
        edgeHidden = false
        setTimeout(() => hideToEdge(), 80)
      } else {
        hideToEdge()
      }
    }
  } else if (previous.edgeAutoHide) {
    restoreFromEdge()
  }
}

function showMainWindow(): void {
  if (!appStarted) {
    showActivationWindow()
    return
  }
  if (!mainWindow) {
    mainWindow = createMainWindow()
    return
  }
  if (edgeHidden) {
    showFromEdge()
    return
  }
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function toggleMainWindow(): void {
  if (!appStarted) {
    showActivationWindow()
    return
  }
  if (edgeHidden) {
    showFromEdge()
    return
  }
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

function createEdgeWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 54,
    height: 640,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    focusable: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  win.setAlwaysOnTop(true, 'floating')
  win.setFocusable(false)

  win.on('closed', () => {
    edgeWindow = null
  })

  loadRenderer(win, 'edge')
  return win
}

function placeEdgeWindow(win: BrowserWindow): void {
  const base =
    edgeRestoreBounds ??
    config.windowBounds ??
    screen.getPrimaryDisplay().workArea
  const area = screen.getDisplayMatching(base).workArea
  const [width] = win.getSize()
  const height = Math.max(240, Math.min(640, area.height - 40))
  win.setSize(width, height)
  win.setPosition(
    Math.round(area.x + area.width - width),
    Math.round(area.y + (area.height - height) / 2)
  )
}

function showEdgeWindow(): void {
  if (!currentSettings().edgeAutoHide) return
  if (!edgeWindow || edgeWindow.isDestroyed()) {
    edgeWindow = createEdgeWindow()
  }
  placeEdgeWindow(edgeWindow)
  edgeWindow.showInactive()
}

function hideEdgeWindowBar(): void {
  if (edgeWindow && !edgeWindow.isDestroyed()) {
    edgeWindow.hide()
  }
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
    { label: '检查更新', click: () => void checkForUpdates() },
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

function normalizeColor(value: unknown, fallback = DEFAULT_ACCENT): string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)
    ? value
    : fallback
}

function normalizeWeekday(value: unknown, fallback: Weekday = 1): Weekday {
  const day = Number(value)
  return WEEKDAYS.includes(day as Weekday) ? (day as Weekday) : fallback
}

function sanitizeCourseInput(input: CourseInput): CourseInput | null {
  if (!input || typeof input.name !== 'string' || !input.name.trim()) return null

  const startTime = normalizeTime(input.startTime)
  const endTime = normalizeTime(input.endTime)
  if (!startTime || !endTime || startTime >= endTime) return null

  return {
    name: input.name.trim().slice(0, 120),
    teacher:
      typeof input.teacher === 'string' ? input.teacher.trim().slice(0, 80) : '',
    location:
      typeof input.location === 'string'
        ? input.location.trim().slice(0, 120)
        : '',
    weekday: normalizeWeekday(input.weekday),
    startTime,
    endTime,
    weeks: typeof input.weeks === 'string' ? input.weeks.trim().slice(0, 80) : '',
    color: normalizeColor(input.color),
    note: typeof input.note === 'string' ? input.note.slice(0, 2000) : ''
  }
}

function sanitizeCoursePlanInput(input: CoursePlanInput): CoursePlanInput | null {
  const base = sanitizeCourseInput(input)
  if (!base) return null

  return {
    ...base,
    semester: SEMESTERS.includes(input.semester as CourseSemester)
      ? (input.semester as CourseSemester)
      : 'fall',
    status: PLAN_STATUSES.includes(input.status as CoursePlanStatus)
      ? (input.status as CoursePlanStatus)
      : 'considering'
  }
}

function normalizeCheckinPeriod(value: unknown): CheckinPeriod {
  return CHECKIN_PERIODS.includes(value as CheckinPeriod)
    ? (value as CheckinPeriod)
    : 'month'
}

function defaultCheckinTarget(period: CheckinPeriod): number {
  if (period === 'week') return 5
  if (period === 'year') return 100
  return 20
}

function sanitizeCheckinInput(input: CheckinInput): CheckinInput | null {
  if (!input || typeof input.name !== 'string' || !input.name.trim()) return null

  const period = normalizeCheckinPeriod(input.period)
  const target = Number(input.targetDays)
  return {
    name: input.name.trim().slice(0, 80),
    color: normalizeColor(input.color),
    period,
    targetDays: Number.isFinite(target)
      ? clamp(Math.round(target), 1, 366)
      : defaultCheckinTarget(period),
    note: typeof input.note === 'string' ? input.note.slice(0, 1000) : ''
  }
}

function cleanupStore(kind: CleanupKind): number {
  const today = todayISO()
  let removed = 0

  if (kind === 'completedTasks') {
    const before = store.tasks.length
    store.tasks = store.tasks.filter((task) => !task.done)
    removed = before - store.tasks.length
  } else if (kind === 'pastReflections') {
    const before = store.reflections.length
    store.reflections = store.reflections.filter((item) => item.date >= today)
    removed = before - store.reflections.length
  } else if (kind === 'expiredAnniversaries') {
    const before = store.anniversaries.length
    store.anniversaries = store.anniversaries.filter(
      (item) => !(item.repeat === 'once' && item.date < today)
    )
    removed = before - store.anniversaries.length
  }

  if (removed > 0) persistStore()
  return removed
}

function registerIpc(): void {
  ipcMain.handle('data:snapshot', () => snapshot())

  ipcMain.handle('project:create', (_event, raw: ProjectInput) => {
    const input = sanitizeProjectInput(raw)
    if (!input) return null

    const now = Date.now()
    const minOrder = store.projects.reduce(
      (min, item) => Math.min(min, item.sortOrder),
      0
    )
    const project: Project = {
      id: randomUUID(),
      name: input.name,
      description: input.description ?? '',
      color: input.color ?? DEFAULT_ACCENT,
      status: input.status ?? 'active',
      startDate: input.startDate ?? todayISO(),
      targetDate: input.targetDate ?? '',
      sortOrder: minOrder - 1,
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

  ipcMain.handle('project:reorder', (_event, ids: unknown) => {
    if (!Array.isArray(ids)) return
    const order = new Map<string, number>()
    ids.forEach((id, index) => {
      if (typeof id === 'string') order.set(id, index)
    })

    for (const project of store.projects) {
      const next = order.get(project.id)
      if (next !== undefined) {
        project.sortOrder = next
        project.updatedAt = Date.now()
      }
    }
    persistStore()
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

  ipcMain.handle('anniversary:create', (_event, raw: AnniversaryInput) => {
    if (!raw || typeof raw.title !== 'string' || !raw.title.trim()) return null
    if (typeof raw.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.date)) {
      return null
    }

    const now = Date.now()
    const anniversary: Anniversary = {
      id: randomUUID(),
      title: raw.title.trim().slice(0, 120),
      date: raw.date,
      repeat: raw.repeat === 'once' ? 'once' : 'yearly',
      note: typeof raw.note === 'string' ? raw.note.slice(0, 2000) : '',
      color:
        typeof raw.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(raw.color)
          ? raw.color
          : DEFAULT_ACCENT,
      createdAt: now,
      updatedAt: now
    }

    store.anniversaries.unshift(anniversary)
    persistStore()
    return anniversary
  })

  ipcMain.handle('anniversary:update', (_event, id: string, patch: AnniversaryPatch) => {
    const anniversary = store.anniversaries.find((item) => item.id === id)
    if (!anniversary || !patch || typeof patch !== 'object') return null

    if (typeof patch.title === 'string' && patch.title.trim()) {
      anniversary.title = patch.title.trim().slice(0, 120)
    }
    if (typeof patch.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(patch.date)) {
      anniversary.date = patch.date
    }
    if (patch.repeat === 'yearly' || patch.repeat === 'once') {
      anniversary.repeat = patch.repeat as AnniversaryRepeat
    }
    if (typeof patch.note === 'string') {
      anniversary.note = patch.note.slice(0, 2000)
    }
    if (typeof patch.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(patch.color)) {
      anniversary.color = patch.color
    }

    anniversary.updatedAt = Date.now()
    persistStore()
    return anniversary
  })

  ipcMain.handle('anniversary:delete', (_event, id: string) => {
    const before = store.anniversaries.length
    store.anniversaries = store.anniversaries.filter((item) => item.id !== id)
    if (store.anniversaries.length !== before) persistStore()
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

  ipcMain.handle('capture:delete', (_event, id: string) => {
    const before = store.captures.length
    store.captures = store.captures.filter((item) => item.id !== id)
    if (store.captures.length !== before) persistStore()
  })

  ipcMain.handle('capture:list', () => store.captures)

  ipcMain.handle('course:create', (_event, raw: CourseInput) => {
    const input = sanitizeCourseInput(raw)
    if (!input) return null

    const now = Date.now()
    const course: Course = {
      id: randomUUID(),
      name: input.name,
      teacher: input.teacher ?? '',
      location: input.location ?? '',
      weekday: input.weekday ?? 1,
      startTime: input.startTime ?? '08:00',
      endTime: input.endTime ?? '09:30',
      weeks: input.weeks ?? '',
      color: input.color ?? DEFAULT_ACCENT,
      note: input.note ?? '',
      createdAt: now,
      updatedAt: now
    }

    store.courses.push(course)
    persistStore()
    return course
  })

  ipcMain.handle('course:update', (_event, id: string, patch: CoursePatch) => {
    const course = store.courses.find((item) => item.id === id)
    if (!course || !patch || typeof patch !== 'object') return null

    const next = sanitizeCourseInput({
      name: typeof patch.name === 'string' ? patch.name : course.name,
      teacher: typeof patch.teacher === 'string' ? patch.teacher : course.teacher,
      location:
        typeof patch.location === 'string' ? patch.location : course.location,
      weekday: patch.weekday ?? course.weekday,
      startTime:
        typeof patch.startTime === 'string' ? patch.startTime : course.startTime,
      endTime:
        typeof patch.endTime === 'string' ? patch.endTime : course.endTime,
      weeks: typeof patch.weeks === 'string' ? patch.weeks : course.weeks,
      color: typeof patch.color === 'string' ? patch.color : course.color,
      note: typeof patch.note === 'string' ? patch.note : course.note
    })
    if (!next) return null

    Object.assign(course, next, { updatedAt: Date.now() })
    persistStore()
    return course
  })

  ipcMain.handle('course:delete', (_event, id: string) => {
    const before = store.courses.length
    store.courses = store.courses.filter((item) => item.id !== id)
    if (store.courses.length !== before) persistStore()
  })

  ipcMain.handle('course-plan:create', (_event, raw: CoursePlanInput) => {
    const input = sanitizeCoursePlanInput(raw)
    if (!input) return null

    const now = Date.now()
    const plan: CoursePlan = {
      id: randomUUID(),
      name: input.name,
      teacher: input.teacher ?? '',
      location: input.location ?? '',
      weekday: input.weekday ?? 1,
      startTime: input.startTime ?? '08:00',
      endTime: input.endTime ?? '09:30',
      weeks: input.weeks ?? '',
      semester: input.semester ?? 'fall',
      status: input.status ?? 'considering',
      note: input.note ?? '',
      color: input.color ?? DEFAULT_ACCENT,
      createdAt: now,
      updatedAt: now
    }

    store.coursePlans.unshift(plan)
    persistStore()
    return plan
  })

  ipcMain.handle(
    'course-plan:update',
    (_event, id: string, patch: CoursePlanPatch) => {
      const plan = store.coursePlans.find((item) => item.id === id)
      if (!plan || !patch || typeof patch !== 'object') return null

      const next = sanitizeCoursePlanInput({
        name: typeof patch.name === 'string' ? patch.name : plan.name,
        teacher: typeof patch.teacher === 'string' ? patch.teacher : plan.teacher,
        location:
          typeof patch.location === 'string' ? patch.location : plan.location,
        weekday: patch.weekday ?? plan.weekday,
        startTime:
          typeof patch.startTime === 'string' ? patch.startTime : plan.startTime,
        endTime:
          typeof patch.endTime === 'string' ? patch.endTime : plan.endTime,
        weeks: typeof patch.weeks === 'string' ? patch.weeks : plan.weeks,
        semester: patch.semester ?? plan.semester,
        status: patch.status ?? plan.status,
        note: typeof patch.note === 'string' ? patch.note : plan.note,
        color: typeof patch.color === 'string' ? patch.color : plan.color
      })
      if (!next) return null

      Object.assign(plan, next, { updatedAt: Date.now() })
      persistStore()
      return plan
    }
  )

  ipcMain.handle('course-plan:delete', (_event, id: string) => {
    const before = store.coursePlans.length
    store.coursePlans = store.coursePlans.filter((item) => item.id !== id)
    if (store.coursePlans.length !== before) persistStore()
  })

  ipcMain.handle('course-plan:promote', (_event, id: string) => {
    const plan = store.coursePlans.find((item) => item.id === id)
    if (!plan) return null

    const existing = store.courses.find(
      (course) =>
        course.name === plan.name &&
        course.weekday === plan.weekday &&
        course.startTime === plan.startTime &&
        course.endTime === plan.endTime
    )

    let course = existing
    if (!course) {
      const now = Date.now()
      course = {
        id: randomUUID(),
        name: plan.name,
        teacher: plan.teacher,
        location: plan.location,
        weekday: plan.weekday,
        startTime: plan.startTime,
        endTime: plan.endTime,
        weeks: plan.weeks,
        color: plan.color,
        note: plan.note,
        createdAt: now,
        updatedAt: now
      }
      store.courses.push(course)
    }

    plan.status = 'selected'
    plan.updatedAt = Date.now()
    persistStore()
    return { course, plan }
  })

  ipcMain.handle('checkin:create', (_event, raw: CheckinInput) => {
    const input = sanitizeCheckinInput(raw)
    if (!input) return null

    const now = Date.now()
    const checkin: Checkin = {
      id: randomUUID(),
      name: input.name,
      color: input.color ?? DEFAULT_ACCENT,
      targetDays: input.targetDays ?? 20,
      period: input.period ?? 'month',
      note: input.note ?? '',
      createdAt: now,
      updatedAt: now
    }

    store.checkins.push(checkin)
    persistStore()
    return checkin
  })

  ipcMain.handle('checkin:update', (_event, id: string, patch: CheckinPatch) => {
    const checkin = store.checkins.find((item) => item.id === id)
    if (!checkin || !patch || typeof patch !== 'object') return null

    const next = sanitizeCheckinInput({
      name: typeof patch.name === 'string' ? patch.name : checkin.name,
      color: typeof patch.color === 'string' ? patch.color : checkin.color,
      targetDays:
        typeof patch.targetDays === 'number'
          ? patch.targetDays
          : checkin.targetDays,
      period: patch.period ?? checkin.period,
      note: typeof patch.note === 'string' ? patch.note : checkin.note
    })
    if (!next) return null

    Object.assign(checkin, next, { updatedAt: Date.now() })
    persistStore()
    return checkin
  })

  ipcMain.handle('checkin:delete', (_event, id: string) => {
    const before = store.checkins.length
    store.checkins = store.checkins.filter((item) => item.id !== id)
    if (store.checkins.length !== before) {
      store.checkinRecords = store.checkinRecords.filter(
        (record) => record.checkinId !== id
      )
      persistStore()
    }
  })

  ipcMain.handle(
    'checkin:toggle',
    (_event, checkinId: string, date: string) => {
      if (
        !store.checkins.some((item) => item.id === checkinId) ||
        typeof date !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        date > todayISO()
      ) {
        return null
      }

      const existing = store.checkinRecords.find(
        (record) => record.checkinId === checkinId && record.date === date
      )
      if (existing) {
        store.checkinRecords = store.checkinRecords.filter(
          (record) => record.id !== existing.id
        )
        persistStore()
        return { checked: false, record: null }
      }

      const record: CheckinRecord = {
        id: randomUUID(),
        checkinId,
        date,
        createdAt: Date.now()
      }
      store.checkinRecords.push(record)
      persistStore()
      return { checked: true, record }
    }
  )

  ipcMain.handle('data:cleanup', (_event, kind: CleanupKind): CleanupResult => {
    if (
      kind !== 'completedTasks' &&
      kind !== 'pastReflections' &&
      kind !== 'expiredAnniversaries'
    ) {
      return { removed: 0, snapshot: snapshot() }
    }
    const removed = cleanupStore(kind)
    return { removed, snapshot: snapshot() }
  })

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
        if (patch.fixedPosition) config.edgeAutoHide = false
      }
      if (CORNERS.includes(patch.windowCorner as WindowCorner)) {
        config.windowCorner = patch.windowCorner as WindowCorner
      }
      if (typeof patch.sidebarCollapsed === 'boolean') {
        config.sidebarCollapsed = patch.sidebarCollapsed
      }
      if (typeof patch.edgeAutoHide === 'boolean') {
        config.edgeAutoHide = patch.edgeAutoHide
        if (patch.edgeAutoHide) {
          config.fixedPosition = false
          config.alwaysOnTop = false
        }
      }
      config.edgeSide = 'right'
      if (typeof patch.autoCheckUpdate === 'boolean') {
        config.autoCheckUpdate = patch.autoCheckUpdate
      }
    }

    persistConfig()

    if (mainWindow) {
      const next = currentSettings()
      applyWindowSettings(mainWindow)

      if (next.fixedPosition && !next.edgeAutoHide) {
        if (patch?.windowCorner && next.windowCorner !== previous.windowCorner) {
          placeWindow(mainWindow, next.windowCorner)
          config.windowBounds = mainWindow.getBounds()
          persistConfig()
        } else if (!previous.fixedPosition) {
          config.windowBounds = mainWindow.getBounds()
          persistConfig()
        }
      }

      applyEdgeBehavior(previous, next)
    }

    if (typeof patch?.autoCheckUpdate === 'boolean') {
      if (patch.autoCheckUpdate) {
        void checkForUpdates()
        if (!updateTimer) {
          updateTimer = setInterval(() => {
            if (currentSettings().autoCheckUpdate) {
              void checkForUpdates()
            }
          }, 6 * 60 * 60 * 1000)
        }
      } else if (updateTimer) {
        clearInterval(updateTimer)
        updateTimer = null
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

  ipcMain.handle('update:check', () => checkForUpdates())
  ipcMain.handle('update:status', () => currentUpdateStatus())
  ipcMain.on('update:install', () => installUpdate())

  ipcMain.on('window:edge', (_event, action: unknown) => {
    if (action === 'show') {
      showFromEdge()
    } else if (action === 'hide') {
      scheduleEdgeHide()
    }
  })

  ipcMain.on('edge:activate', (_event, key: unknown) => {
    if (typeof key !== 'string') return
    hideEdgeWindowBar()
    showFromEdge()
    mainWindow?.webContents.send('navigate:module', key)
  })

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

function loadStoredLicense(): boolean {
  const code = typeof config.license === 'string' ? config.license : ''
  if (!code) return false

  const result = verifyLicenseCode(code)
  if (!result.ok) {
    delete config.license
    persistConfig()
    return false
  }

  licenseInfo = result.payload
  return true
}

function createActivationWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 560,
    height: 640,
    show: false,
    resizable: false,
    minimizable: true,
    maximizable: false,
    title: 'SmartPlanner 激活',
    backgroundColor: '#f6f7f9',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  win.setMenuBarVisibility(false)

  win.on('closed', () => {
    activationWindow = null
    if (!appStarted && !isQuitting) app.quit()
  })

  loadRenderer(win, 'activate')
  win.once('ready-to-show', () => win.show())
  return win
}

function showActivationWindow(): void {
  if (!activationWindow || activationWindow.isDestroyed()) {
    activationWindow = createActivationWindow()
    return
  }
  if (activationWindow.isMinimized()) activationWindow.restore()
  activationWindow.show()
  activationWindow.focus()
}

function registerLicenseIpc(): void {
  ipcMain.handle('license:status', () => currentLicenseStatus())

  ipcMain.handle('license:activate', (_event, raw: unknown): ActivationResult => {
    const code = typeof raw === 'string' ? raw : ''
    const result = verifyLicenseCode(code)
    if (!result.ok) {
      return {
        ok: false,
        message: result.message,
        status: currentLicenseStatus()
      }
    }

    config.license = code.trim()
    persistConfig()
    licenseInfo = result.payload
    setImmediate(() => startApp())
    return {
      ok: true,
      message: '激活成功',
      status: currentLicenseStatus()
    }
  })

  ipcMain.on('license:quit', () => {
    isQuitting = true
    app.quit()
  })

  ipcMain.handle('clipboard:write', (_event, text: unknown) => {
    if (typeof text === 'string') clipboard.writeText(text)
  })
}

function startApp(): void {
  if (appStarted) return
  appStarted = true

  initStore()
  ensureDailyBackup()
  registerIpc()
  createTray()
  initUpdater(() => mainWindow)
  mainWindow = createMainWindow()

  if (activationWindow && !activationWindow.isDestroyed()) {
    activationWindow.close()
  }
  activationWindow = null

  if (currentSettings().autoCheckUpdate) {
    setTimeout(() => {
      void checkForUpdates()
    }, 8000)
    updateTimer = setInterval(() => {
      if (currentSettings().autoCheckUpdate) {
        void checkForUpdates()
      }
    }, 6 * 60 * 60 * 1000)
  }

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
}

const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (appStarted) showMainWindow()
    else showActivationWindow()
  })

  app.whenReady().then(() => {
    app.setAppUserModelId(APP_ID)

    initConfig()
    registerLicenseIpc()

    if (loadStoredLicense()) {
      startApp()
    } else {
      showActivationWindow()
    }

    app.on('activate', showMainWindow)
  })

  app.on('before-quit', () => {
    isQuitting = true
  })

  app.on('will-quit', () => {
    globalShortcut.unregisterAll()
    if (updateTimer) clearInterval(updateTimer)
    cancelEdgeHide()
  })

  app.on('window-all-closed', () => {
  })
}
