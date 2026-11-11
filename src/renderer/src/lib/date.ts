export function toISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function addDaysISO(iso: string, delta: number): string {
  const date = parseISODate(iso)
  date.setDate(date.getDate() + delta)
  return toISODate(date)
}

export function tomorrowISO(): string {
  return addDaysISO(todayISO(), 1)
}

export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

export function formatFullDate(iso: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }).format(parseISODate(iso))
}

export function formatDayDate(iso: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }).format(parseISODate(iso))
}

export function formatMonthTitle(year: number, month: number): string {
  return `${year}年${month + 1}月`
}

export function monthCells(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7
  const start = new Date(year, month, 1 - offset)
  return Array.from(
    { length: 42 },
    (_, index) =>
      new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
  )
}

export function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(timestamp))
}
