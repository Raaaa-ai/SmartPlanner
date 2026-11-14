import koffi from 'koffi'
import type { BrowserWindow } from 'electron'
import { screen } from 'electron'

export type DesktopMode = 'desktop' | 'fallback'

export interface DesktopAttachResult {
  mode: DesktopMode
  message?: string
}

interface DesktopBounds {
  x: number
  y: number
  width: number
  height: number
}

const GWL_STYLE = -16
const GWL_EXSTYLE = -20
const WS_CHILD = 0x40000000
const WS_POPUP = 0x80000000
const WS_VISIBLE = 0x10000000
const WS_CLIPSIBLINGS = 0x04000000
const WS_EX_TOOLWINDOW = 0x00000080
const WS_EX_APPWINDOW = 0x00040000
const WS_EX_NOACTIVATE = 0x08000000
const WS_EX_TRANSPARENT = 0x00000020
const SWP_NOSIZE = 0x0001
const SWP_NOMOVE = 0x0002
const SWP_NOACTIVATE = 0x0010
const SWP_FRAMECHANGED = 0x0020
const SWP_SHOWWINDOW = 0x0040
const SWP_NOSENDCHANGING = 0x0400
const SMTO_NORMAL = 0x0000
const SW_SHOWNOACTIVATE = 4
const VK_LBUTTON = 0x01

let api: {
  FindWindowW: (className: string | null, windowName: string | null) => any
  FindWindowExW: (
    parent: any,
    childAfter: any,
    className: string | null,
    windowName: string | null
  ) => any
  SendMessageTimeoutW: (
    hwnd: any,
    msg: number,
    wParam: number,
    lParam: number,
    flags: number,
    timeout: number,
    result: Buffer
  ) => any
  EnumWindows: (callback: any, lParam: number) => number
  SetParent: (child: any, parent: any) => any
  GetWindowLongPtrW: (hwnd: any, index: number) => any
  SetWindowLongPtrW: (hwnd: any, index: number, value: any) => any
  SetWindowPos: (
    hwnd: any,
    insertAfter: any,
    x: number,
    y: number,
    width: number,
    height: number,
    flags: number
  ) => number
  ShowWindow: (hwnd: any, cmd: number) => number
  IsWindow: (hwnd: any) => number
  SetForegroundWindow: (hwnd: any) => number
  SetActiveWindow: (hwnd: any) => any
  SetFocus: (hwnd: any) => any
  GetAsyncKeyState: (key: number) => number
} | null = null

let attached = false
let attempted = false
let parentHwnd: number | null = null
let attachedWindow: BrowserWindow | null = null
let watchTimer: NodeJS.Timeout | null = null
let lastBounds: DesktopBounds | null = null

function getApi(): typeof api {
  if (process.platform !== 'win32') return null
  if (api) return api

  const koffiAny = koffi as any
  const user32 = koffiAny.load('user32.dll')
  const EnumWindowsCallback = koffiAny.proto(
    '__stdcall',
    'EnumWindowsCallback',
    'int32',
    ['void *', 'intptr_t']
  )

  api = {
    FindWindowW: user32.func('__stdcall', 'FindWindowW', 'void *', [
      'str16',
      'str16'
    ]),
    FindWindowExW: user32.func('__stdcall', 'FindWindowExW', 'void *', [
      'void *',
      'void *',
      'str16',
      'str16'
    ]),
    SendMessageTimeoutW: user32.func(
      '__stdcall',
      'SendMessageTimeoutW',
      'intptr_t',
      ['void *', 'uint32', 'uintptr_t', 'intptr_t', 'uint32', 'uint32', 'void *']
    ),
    EnumWindows: user32.func('__stdcall', 'EnumWindows', 'int32', [
      koffiAny.pointer(EnumWindowsCallback),
      'intptr_t'
    ]),
    SetParent: user32.func('__stdcall', 'SetParent', 'void *', [
      'void *',
      'void *'
    ]),
    GetWindowLongPtrW: user32.func(
      '__stdcall',
      'GetWindowLongPtrW',
      'intptr_t',
      ['void *', 'int32']
    ),
    SetWindowLongPtrW: user32.func(
      '__stdcall',
      'SetWindowLongPtrW',
      'intptr_t',
      ['void *', 'int32', 'intptr_t']
    ),
    SetWindowPos: user32.func('__stdcall', 'SetWindowPos', 'int32', [
      'void *',
      'void *',
      'int32',
      'int32',
      'int32',
      'int32',
      'uint32'
    ]),
    ShowWindow: user32.func('__stdcall', 'ShowWindow', 'int32', [
      'void *',
      'int32'
    ]),
    IsWindow: user32.func('__stdcall', 'IsWindow', 'int32', ['void *']),
    SetForegroundWindow: user32.func(
      '__stdcall',
      'SetForegroundWindow',
      'int32',
      ['void *']
    ),
    SetActiveWindow: user32.func('__stdcall', 'SetActiveWindow', 'void *', [
      'void *'
    ]),
    SetFocus: user32.func('__stdcall', 'SetFocus', 'void *', ['void *']),
    GetAsyncKeyState: user32.func(
      '__stdcall',
      'GetAsyncKeyState',
      'short',
      ['int32']
    )
  }

  return api
}

function hwndOf(win: BrowserWindow): number {
  const buffer = win.getNativeWindowHandle()
  return buffer.length >= 8
    ? Number(buffer.readBigUInt64LE(0))
    : buffer.readUInt32LE(0)
}

function findShellViewParent(): number | null {
  const a = getApi()
  if (!a) return null

  const progman = a.FindWindowW('Progman', null)
  if (!progman) return null

  const result = Buffer.alloc(8)
  a.SendMessageTimeoutW(progman, 0x052c, 0xd, 0x1, SMTO_NORMAL, 1000, result)

  let shellViewParent: number | null = null
  const callback = (koffi as any).register((hwnd: number) => {
    const defView = a.FindWindowExW(hwnd, null, 'SHELLDLL_DefView', null)
    if (defView) {
      shellViewParent = hwnd
      return 0
    }
    return 1
  }, (koffi as any).pointer((koffi as any).proto('__stdcall', 'EnumWindowsCb', 'int32', ['void *', 'intptr_t'])))

  a.EnumWindows(callback, 0)
  ;(koffi as any).unregister(callback)
  return shellViewParent
}

function physicalBounds(bounds: DesktopBounds): DesktopBounds {
  const display = screen.getPrimaryDisplay()
  const scale = display.scaleFactor || 1
  return {
    x: Math.round(bounds.x * scale),
    y: Math.round(bounds.y * scale),
    width: Math.max(1, Math.round(bounds.width * scale)),
    height: Math.max(1, Math.round(bounds.height * scale))
  }
}

export function attachWindowToDesktop(
  win: BrowserWindow,
  bounds: DesktopBounds
): DesktopAttachResult {
  attempted = true
  const a = getApi()
  if (!a) {
    attached = false
    return { mode: 'fallback', message: '仅支持 Windows' }
  }

  const hwnd = hwndOf(win)
  const parent = findShellViewParent()
  if (!parent) {
    attached = false
    return { mode: 'fallback', message: '未找到桌面 WorkerW' }
  }

  try {
    const exStyle = Number(a.GetWindowLongPtrW(hwnd, GWL_EXSTYLE))
    const nextExStyle =
      (exStyle | WS_EX_TOOLWINDOW) &
      ~WS_EX_APPWINDOW &
      ~WS_EX_NOACTIVATE &
      ~WS_EX_TRANSPARENT
    a.SetWindowLongPtrW(hwnd, GWL_EXSTYLE, nextExStyle)

    const style = Number(a.GetWindowLongPtrW(hwnd, GWL_STYLE))
    const nextStyle =
      (style & ~WS_POPUP) | WS_CHILD | WS_VISIBLE | WS_CLIPSIBLINGS
    a.SetWindowLongPtrW(hwnd, GWL_STYLE, nextStyle)

    const result = a.SetParent(hwnd, parent)
    if (!result) {
      attached = false
      return { mode: 'fallback', message: 'SetParent 失败' }
    }

    const physical = physicalBounds(bounds)
    a.SetWindowPos(
      hwnd,
      0,
      physical.x,
      physical.y,
      physical.width,
      physical.height,
      SWP_NOACTIVATE | SWP_FRAMECHANGED | SWP_SHOWWINDOW | SWP_NOSENDCHANGING
    )
    a.ShowWindow(hwnd, SW_SHOWNOACTIVATE)

    attached = true
    parentHwnd = parent
    attachedWindow = win
    lastBounds = bounds
    startWatch(win)

    return { mode: 'desktop' }
  } catch (error) {
    attached = false
    return {
      mode: 'fallback',
      message: error instanceof Error ? error.message : String(error)
    }
  }
}

function startWatch(win: BrowserWindow): void {
  stopWatch()
  watchTimer = setInterval(() => {
    if (win.isDestroyed() || !attached || !parentHwnd) return
    const a = getApi()
    if (!a) return
    if (!a.IsWindow(parentHwnd)) {
      attached = false
      parentHwnd = null
      if (lastBounds) attachWindowToDesktop(win, lastBounds)
    }
  }, 5000)
}

function stopWatch(): void {
  if (watchTimer) {
    clearInterval(watchTimer)
    watchTimer = null
  }
}

export function detachWindowFromDesktop(win: BrowserWindow): void {
  stopWatch()
  const a = getApi()
  if (a && !win.isDestroyed()) {
    try {
      const hwnd = hwndOf(win)
      const style = Number(a.GetWindowLongPtrW(hwnd, GWL_STYLE))
      if (style & WS_CHILD) {
        a.SetWindowLongPtrW(
          hwnd,
          GWL_STYLE,
          (style & ~WS_CHILD) | WS_POPUP
        )
        a.SetParent(hwnd, null)
      }
    } catch {
    }
  }
  attached = false
  parentHwnd = null
  attachedWindow = null
}

export function reattachWindowToDesktop(
  win: BrowserWindow
): DesktopAttachResult {
  if (lastBounds) return attachWindowToDesktop(win, lastBounds)
  return attachWindowToDesktop(win, win.getBounds())
}

export function getDesktopMode(): DesktopMode {
  if (!attempted) return 'fallback'
  return attached ? 'desktop' : 'fallback'
}

export function isDesktopAttached(): boolean {
  return attached
}

export function moveWindowToScreen(
  win: BrowserWindow,
  x: number,
  y: number
): void {
  const a = getApi()
  if (!a || win.isDestroyed()) return
  const size = lastBounds ?? win.getBounds()
  if (attached) {
    const physical = physicalBounds({
      x,
      y,
      width: size.width,
      height: size.height
    })
    a.SetWindowPos(
      hwndOf(win),
      0,
      physical.x,
      physical.y,
      physical.width,
      physical.height,
      SWP_NOACTIVATE | SWP_NOSENDCHANGING | SWP_SHOWWINDOW
    )
    lastBounds = { x, y, width: size.width, height: size.height }
  } else {
    win.setPosition(Math.round(x), Math.round(y))
  }
}

export function focusDesktopWindow(win: BrowserWindow): void {
  const a = getApi()
  if (!a || win.isDestroyed()) return
  try {
    const hwnd = hwndOf(win)
    a.SetForegroundWindow(hwnd)
    a.SetActiveWindow(hwnd)
    a.SetFocus(hwnd)
  } catch {
  }
  win.focus()
}

export function isLeftMouseDown(): boolean {
  const a = getApi()
  if (!a) return false
  try {
    return (Number(a.GetAsyncKeyState(VK_LBUTTON)) & 0x8000) !== 0
  } catch {
    return false
  }
}

export function getAttachedWindow(): BrowserWindow | null {
  return attachedWindow
}
