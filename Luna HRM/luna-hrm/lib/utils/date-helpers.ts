/**
 * Parse a YYYY-MM-DD string as a local calendar date (NOT UTC).
 * Use instead of new Date('YYYY-MM-DD') which parses as UTC midnight and
 * can shift the date backward by one day in UTC- timezones.
 */
export function parseIsoDateLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d) // local midnight
}

/**
 * Get Monday of the week for a given date
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Get Sunday of the week for a given date
 */
export function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return end
}

/**
 * Format date as DD/MM/YYYY (Vietnamese convention)
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

/**
 * Format date as YYYY-MM-DD (for database/API).
 * Uses local calendar date — NOT UTC — so Vietnam UTC+7 dates never shift backward.
 */
export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Vietnamese day names (Monday=T2, ..., Sunday=CN)
 */
export const VIETNAMESE_DAYS = [
  "CN", // 0 = Sunday
  "T2", // 1 = Monday
  "T3", // 2 = Tuesday
  "T4", // 3 = Wednesday
  "T5", // 4 = Thursday
  "T6", // 5 = Friday
  "T7", // 6 = Saturday
] as const

/**
 * Convert day-of-week number (1=Mon...7=Sun) to Vietnamese name
 */
export function getDayName(dayOfWeek: number): string {
  const map: Record<number, string> = {
    1: "T2",
    2: "T3",
    3: "T4",
    4: "T5",
    5: "T6",
    6: "T7",
    7: "CN",
  }
  return map[dayOfWeek] ?? ""
}

/**
 * Get all dates in a week (Mon-Sun) for a given week start
 */
export function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })
}

/**
 * Get month name in Vietnamese
 */
export function getMonthName(month: number): string {
  return `Tháng ${month}`
}

/**
 * Format week range: "02/03 - 08/03/2026"
 */
export function formatWeekRange(weekStart: Date): string {
  const end = getWeekEnd(weekStart)
  const startStr = weekStart.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
  const endStr = formatDate(end)
  return `${startStr} - ${endStr}`
}

/**
 * Check if a week is auto-locked (> 3 days past week end / Sunday).
 * weekStart + 7 days = Sunday, + 3 grace days = +10 from Monday.
 */
export function isWeekLocked(weekStart: Date): boolean {
  const nextMonday = new Date(weekStart)
  nextMonday.setDate(nextMonday.getDate() + 10) // week end (7) + 3 grace days
  return new Date() > nextMonday
}

/**
 * Convert ISO day-of-week (1=Mon..7=Sun) to JS Date.getDay() (0=Sun..6=Sat)
 */
export function isoToJsDay(isoDay: number): number {
  return isoDay === 7 ? 0 : isoDay
}

/**
 * Convert JS Date.getDay() (0=Sun..6=Sat) to ISO day-of-week (1=Mon..7=Sun)
 */
export function jsDayToIso(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay
}

/**
 * Get ISO day-of-week for a Date
 */
export function getIsoDay(date: Date): number {
  return jsDayToIso(date.getDay())
}

/**
 * Build YYYY-MM-DD boundaries for the first/last day of a month.
 * Extracted here so attendance and payroll modules can share it.
 */
export function getMonthBounds(month: number, year: number): { startDate: string; endDate: string } {
  const pad = (n: number) => String(n).padStart(2, '0')
  const startDate = `${year}-${pad(month)}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${pad(month)}-${pad(lastDay)}`
  return { startDate, endDate }
}
