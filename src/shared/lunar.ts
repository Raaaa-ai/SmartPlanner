import { Lunar, LunarMonth, LunarYear, Solar } from 'lunar-typescript'

export interface LunarDateParts {
  year: number
  month: number
  day: number
  leap: boolean
}

export const LUNAR_MONTH_LABELS = [
  '正月',
  '二月',
  '三月',
  '四月',
  '五月',
  '六月',
  '七月',
  '八月',
  '九月',
  '十月',
  '冬月',
  '腊月'
]

export const LUNAR_DAY_LABELS = [
  '初一',
  '初二',
  '初三',
  '初四',
  '初五',
  '初六',
  '初七',
  '初八',
  '初九',
  '初十',
  '十一',
  '十二',
  '十三',
  '十四',
  '十五',
  '十六',
  '十七',
  '十八',
  '十九',
  '二十',
  '廿一',
  '廿二',
  '廿三',
  '廿四',
  '廿五',
  '廿六',
  '廿七',
  '廿八',
  '廿九',
  '三十'
]

export function leapMonthOfYear(year: number): number {
  try {
    return LunarYear.fromYear(year).getLeapMonth()
  } catch {
    return 0
  }
}

export function lunarMonthDayCount(
  year: number,
  month: number,
  leap: boolean
): number {
  try {
    const lunarMonth = LunarMonth.fromYm(year, leap ? -month : month)
    return lunarMonth?.getDayCount() ?? 30
  } catch {
    return 30
  }
}

export function solarToLunarParts(iso: string): LunarDateParts {
  const [year, month, day] = iso.split('-').map(Number)
  try {
    const lunar = Solar.fromYmd(year, month, day).getLunar()
    const lunarMonth = lunar.getMonth()
    return {
      year: lunar.getYear(),
      month: Math.abs(lunarMonth),
      day: lunar.getDay(),
      leap: lunarMonth < 0
    }
  } catch {
    return { year, month, day, leap: false }
  }
}

export function parseLunarDate(
  iso: string,
  leap: boolean
): LunarDateParts | null {
  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) return null
  return { year, month, day, leap }
}

export function lunarPartsToSolar(parts: LunarDateParts): string | null {
  try {
    const month = parts.leap ? -parts.month : parts.month
    return Lunar.fromYmd(parts.year, month, parts.day).getSolar().toYmd()
  } catch {
    return null
  }
}

export function isValidLunarParts(parts: LunarDateParts): boolean {
  return lunarPartsToSolar(parts) !== null
}

export function lunarPartsLabel(
  parts: LunarDateParts,
  includeYear = false
): string {
  try {
    const month = parts.leap ? -parts.month : parts.month
    const lunar = Lunar.fromYmd(parts.year, month, parts.day)
    return `农历${includeYear ? `${lunar.getYearInChinese()}年` : ''}${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`
  } catch {
    return `农历${parts.leap ? '闰' : ''}${LUNAR_MONTH_LABELS[parts.month - 1] ?? parts.month}${LUNAR_DAY_LABELS[parts.day - 1] ?? parts.day}`
  }
}

export function nextLunarOccurrence(
  dateISO: string,
  leap: boolean,
  todayISO: string
): string {
  const parts = parseLunarDate(dateISO, leap)
  if (!parts) return dateISO

  const todayLunarYear = solarToLunarParts(todayISO).year

  const candidateFor = (year: number): string => {
    const useLeap = parts.leap && leapMonthOfYear(year) === parts.month
    try {
      const month = useLeap ? -parts.month : parts.month
      return Lunar.fromYmd(year, month, parts.day).getSolar().toYmd()
    } catch {
      return ''
    }
  }

  const current = candidateFor(todayLunarYear)
  if (current && current >= todayISO) return current

  const next = candidateFor(todayLunarYear + 1)
  return next || current || dateISO
}
