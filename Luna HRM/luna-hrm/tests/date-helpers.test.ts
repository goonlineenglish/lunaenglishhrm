import { describe, it, expect } from 'vitest'
import {
  parseIsoDateLocal,
  getWeekStart,
  getWeekEnd,
  toISODate,
  formatDate,
  isWeekLocked,
  isoToJsDay,
  jsDayToIso,
  getIsoDay,
  getWeekDates,
  getDayName,
} from '@/lib/utils/date-helpers'

describe('Date Helpers — Date utility functions', () => {
  describe('parseIsoDateLocal', () => {
    it('parseIsoDateLocal("2026-03-07") → March 7, local midnight (NOT UTC)', () => {
      const date = parseIsoDateLocal('2026-03-07')
      expect(date.getFullYear()).toBe(2026)
      expect(date.getMonth()).toBe(2) // March (0-indexed)
      expect(date.getDate()).toBe(7)
      expect(date.getHours()).toBe(0)
      expect(date.getMinutes()).toBe(0)
      expect(date.getSeconds()).toBe(0)
    })

    it('parseIsoDateLocal("2026-01-01") → January 1', () => {
      const date = parseIsoDateLocal('2026-01-01')
      expect(date.getFullYear()).toBe(2026)
      expect(date.getMonth()).toBe(0)
      expect(date.getDate()).toBe(1)
    })

    it('parseIsoDateLocal("2026-12-31") → December 31', () => {
      const date = parseIsoDateLocal('2026-12-31')
      expect(date.getFullYear()).toBe(2026)
      expect(date.getMonth()).toBe(11)
      expect(date.getDate()).toBe(31)
    })
  })

  describe('getWeekStart', () => {
    it('Wednesday March 4 → Monday March 2', () => {
      // March 4, 2026 is a Wednesday
      const wed = new Date(2026, 2, 4)
      const start = getWeekStart(wed)
      expect(start.getDate()).toBe(2)
      expect(start.getDay()).toBe(1) // Monday
    })

    it('Monday → same Monday', () => {
      const mon = new Date(2026, 2, 2)
      const start = getWeekStart(mon)
      expect(start.getDate()).toBe(2)
      expect(start.getDay()).toBe(1)
    })

    it('Sunday → previous Monday (Sunday March 1 → Monday Feb 23)', () => {
      const sun = new Date(2026, 2, 1) // March 1, 2026 (Sunday)
      const start = getWeekStart(sun)
      // When Sunday is day 0, diff = 1 - 0 + (-6) = -5
      // March 1 - 5 days = February 23 (Monday of previous week)
      expect(start.getDate()).toBe(23)
      expect(start.getDay()).toBe(1)
    })

    it('Saturday → Monday of same week', () => {
      const sat = new Date(2026, 2, 7) // March 7, 2026 (Saturday)
      const start = getWeekStart(sat)
      expect(start.getDate()).toBe(2)
      expect(start.getDay()).toBe(1)
    })

    it('midnight is set to 00:00:00', () => {
      const date = new Date(2026, 2, 4, 15, 30, 45)
      const start = getWeekStart(date)
      expect(start.getHours()).toBe(0)
      expect(start.getMinutes()).toBe(0)
      expect(start.getSeconds()).toBe(0)
    })
  })

  describe('getWeekEnd', () => {
    it('Monday March 2 → Sunday March 8 (6 days after weekStart)', () => {
      const mon = new Date(2026, 2, 2)
      const end = getWeekEnd(mon)
      expect(end.getDate()).toBe(8)
      expect(end.getDay()).toBe(0) // Sunday
    })

    it('week end is 6 days after week start', () => {
      const start = getWeekStart(new Date(2026, 2, 4))
      const end = getWeekEnd(start)
      const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      expect(diff).toBe(6)
    })
  })

  describe('toISODate', () => {
    it('toISODate(new Date(2026, 2, 7)) → "2026-03-07" (local, not UTC)', () => {
      const date = new Date(2026, 2, 7)
      const iso = toISODate(date)
      expect(iso).toBe('2026-03-07')
    })

    it('single digit month padded with 0', () => {
      const date = new Date(2026, 0, 5) // January 5
      const iso = toISODate(date)
      expect(iso).toBe('2026-01-05')
    })

    it('single digit day padded with 0', () => {
      const date = new Date(2026, 11, 9) // December 9
      const iso = toISODate(date)
      expect(iso).toBe('2026-12-09')
    })
  })

  describe('formatDate', () => {
    it('formatDate(new Date(2026, 2, 7)) → DD/MM/YYYY Vietnamese format', () => {
      const date = new Date(2026, 2, 7)
      const formatted = formatDate(date)
      expect(formatted).toMatch(/07\/03\/2026|7\/3\/2026/)
    })

    it('formatDate accepts string input', () => {
      const formatted = formatDate('2026-03-07')
      expect(typeof formatted).toBe('string')
    })
  })

  describe('isWeekLocked', () => {
    it('week 10+ days ago → true', () => {
      const oldWeek = new Date()
      oldWeek.setDate(oldWeek.getDate() - 11) // 11 days ago
      expect(isWeekLocked(oldWeek)).toBe(true)
    })

    it('current week → false', () => {
      const today = new Date()
      const weekStart = getWeekStart(today)
      expect(isWeekLocked(weekStart)).toBe(false)
    })

    it('3 days ago → false (still within grace period)', () => {
      const recent = new Date()
      recent.setDate(recent.getDate() - 3)
      const weekStart = getWeekStart(recent)
      expect(isWeekLocked(weekStart)).toBe(false)
    })
  })

  describe('isoToJsDay', () => {
    it('isoToJsDay(1) → 1 (Monday)', () => {
      expect(isoToJsDay(1)).toBe(1)
    })

    it('isoToJsDay(2) → 2 (Tuesday)', () => {
      expect(isoToJsDay(2)).toBe(2)
    })

    it('isoToJsDay(6) → 6 (Saturday)', () => {
      expect(isoToJsDay(6)).toBe(6)
    })

    it('isoToJsDay(7) → 0 (Sunday)', () => {
      expect(isoToJsDay(7)).toBe(0)
    })
  })

  describe('jsDayToIso', () => {
    it('jsDayToIso(0) → 7 (Sunday)', () => {
      expect(jsDayToIso(0)).toBe(7)
    })

    it('jsDayToIso(1) → 1 (Monday)', () => {
      expect(jsDayToIso(1)).toBe(1)
    })

    it('jsDayToIso(6) → 6 (Saturday)', () => {
      expect(jsDayToIso(6)).toBe(6)
    })
  })

  describe('getIsoDay', () => {
    it('getIsoDay returns ISO day-of-week (1=Mon...7=Sun)', () => {
      const mon = new Date(2026, 2, 2) // Monday March 2
      expect(getIsoDay(mon)).toBe(1)

      const sun = new Date(2026, 2, 1) // Sunday March 1
      expect(getIsoDay(sun)).toBe(7)
    })

    it('Wednesday returns 3', () => {
      const wed = new Date(2026, 2, 4)
      expect(getIsoDay(wed)).toBe(3)
    })
  })

  describe('getWeekDates', () => {
    it('returns 7 consecutive dates starting from weekStart', () => {
      const weekStart = new Date(2026, 2, 2) // Monday March 2
      const dates = getWeekDates(weekStart)
      expect(dates).toHaveLength(7)

      // Check each date is one day after the previous
      for (let i = 0; i < 6; i++) {
        const diff = (dates[i + 1].getTime() - dates[i].getTime()) / (1000 * 60 * 60 * 24)
        expect(diff).toBe(1)
      }

      // First should be Monday
      expect(dates[0].getDate()).toBe(2)
      expect(dates[0].getDay()).toBe(1)

      // Last should be Sunday
      expect(dates[6].getDate()).toBe(8)
      expect(dates[6].getDay()).toBe(0)
    })
  })

  describe('getDayName', () => {
    it('getDayName(1) → "T2" (Monday)', () => {
      expect(getDayName(1)).toBe('T2')
    })

    it('getDayName(2) → "T3" (Tuesday)', () => {
      expect(getDayName(2)).toBe('T3')
    })

    it('getDayName(3) → "T4" (Wednesday)', () => {
      expect(getDayName(3)).toBe('T4')
    })

    it('getDayName(4) → "T5" (Thursday)', () => {
      expect(getDayName(4)).toBe('T5')
    })

    it('getDayName(5) → "T6" (Friday)', () => {
      expect(getDayName(5)).toBe('T6')
    })

    it('getDayName(6) → "T7" (Saturday)', () => {
      expect(getDayName(6)).toBe('T7')
    })

    it('getDayName(7) → "CN" (Sunday)', () => {
      expect(getDayName(7)).toBe('CN')
    })

    it('getDayName(unknown) → "" (unknown day)', () => {
      expect(getDayName(99)).toBe('')
    })
  })
})
