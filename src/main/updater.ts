import { app, BrowserWindow, Notification } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdateStatus } from '../shared/types'

type WindowGetter = () => BrowserWindow | null

let status: UpdateStatus = { state: 'idle' }
let getWindow: WindowGetter = () => null
let initialized = false

function broadcast(): void {
  const win = getWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send('update:status', status)
  }
}

function setStatus(next: UpdateStatus): void {
  status = next
  broadcast()
}

export function currentUpdateStatus(): UpdateStatus {
  return status
}

export function initUpdater(
  getter: WindowGetter,
  onUpdateDownloaded?: () => void
): void {
  if (initialized) return
  initialized = true
  getWindow = getter

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    setStatus({ state: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    setStatus({ state: 'available', version: info.version })
  })

  autoUpdater.on('update-not-available', () => {
    setStatus({ state: 'not-available', checkedAt: Date.now() })
  })

  autoUpdater.on('download-progress', (progress) => {
    setStatus({
      state: 'downloading',
      version: status.version,
      percent: Math.round(progress.percent)
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    try {
      onUpdateDownloaded?.()
    } catch {
    }
    setStatus({
      state: 'downloaded',
      version: info.version,
      percent: 100,
      checkedAt: Date.now()
    })
    try {
      if (app.isPackaged && Notification.isSupported()) {
        new Notification({
          title: 'SmartPlanner 更新已就绪',
          body: `新版本 ${info.version} 已下载，重启应用即可完成安装。`
        }).show()
      }
    } catch {
    }
  })

  autoUpdater.on('error', (error) => {
    setStatus({
      state: 'error',
      version: status.version,
      message: error instanceof Error ? error.message : String(error),
      checkedAt: Date.now()
    })
  })
}

export async function checkForUpdates(): Promise<UpdateStatus> {
  if (!app.isPackaged) {
    const next: UpdateStatus = {
      state: 'not-available',
      message: '开发模式下不检查更新',
      checkedAt: Date.now()
    }
    setStatus(next)
    return next
  }

  setStatus({ state: 'checking' })
  try {
    await autoUpdater.checkForUpdates()
  } catch (error) {
    setStatus({
      state: 'error',
      message: error instanceof Error ? error.message : String(error),
      checkedAt: Date.now()
    })
  }
  return status
}

export function installUpdate(): void {
  if (status.state !== 'downloaded') return
  setImmediate(() => {
    autoUpdater.quitAndInstall(true, true)
  })
}
