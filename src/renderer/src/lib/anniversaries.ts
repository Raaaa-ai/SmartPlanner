import type { Anniversary } from '../../../shared/types'
import { parseISODate, toISODate, todayISO } from './date'

export interface AnniversaryCountdown {
  nextDate: string
  days: number
  label: string
}

function daysBetween(fromISO: string, toISO: string): number {
  const from = parseISODate(fromISO)
  const to = parseISODate(toISO)
  return Math.round((to.getTime() - from.getTime()) / 86400000)
}

export function nextOccurrence(
  anniversary: Anniversary,
  today = todayISO()
): string {
  if (anniversary.repeat === 'once') return anniversary.date

  const base = parseISODate(anniversary.date)
  const current = parseISODate(today)
  let year = current.getFullYear()
  let candidate = new Date(year, base.getMonth(), base.getDate())
  if (candidate.getTime() < current.getTime()) {
    year += 1
    candidate = new Date(year, base.getMonth(), base.getDate())
  }
  return toISODate(candidate)
}

export function countdownFor(
  anniversary: Anniversary,
  today = todayISO()
): AnniversaryCountdown {
  const nextDate = nextOccurrence(anniversary, today)
  const days = daysBetween(today, nextDate)

  if (days === 0) {
    return { nextDate, days, label: '就是今天' }
  }
  if (days > 0) {
    return { nextDate, days, label: `还有 ${days} 天` }
  }
  return { nextDate, days, label: `已过去 ${Math.abs(days)} 天` }
}

export function sortByCountdown(
  anniversaries: Anniversary[],
  today = todayISO()
): Anniversary[] {
  const weight = (item: Anniversary): number => {
    const days = daysBetween(today, nextOccurrence(item, today))
    return days < 0 ? 365000 + Math.abs(days) : days
  }

  return [...anniversaries].sort((a, b) => weight(a) - weight(b))
}
