'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/actions/auth-actions'

export interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

export interface MyAttendanceDay {
  date: string
  status: string
  class_code?: string
}

export interface MyAttendanceSummary {
  present: number
  absent: number
  kp: number
  half: number
}

export interface MyAttendanceData {
  days: MyAttendanceDay[]
  summary: MyAttendanceSummary
}

export async function getMyAttendance(
  month: number,
  year: number
): Promise<ActionResult<MyAttendanceData>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập.' }

    if (month < 1 || month > 12 || year < 2020 || year > 2100) {
      return { success: false, error: 'Tháng/năm không hợp lệ.' }
    }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDayDate = new Date(year, month, 0)
    const lastDay = `${year}-${String(month).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`

    const days: MyAttendanceDay[] = []

    if (user.position === 'office' || user.position === 'admin') {
      const { data, error } = await sb
        .from('office_attendance')
        .select('date, status')
        .eq('employee_id', user.id)
        .gte('date', firstDay)
        .lte('date', lastDay)
        .order('date')
      if (error) throw error

      for (const row of (data ?? []) as Array<{ date: string; status: string }>) {
        days.push({ date: row.date, status: row.status })
      }
    } else {
      const { data, error } = await sb
        .from('attendance')
        .select('date, status, class_schedules(class_code)')
        .eq('employee_id', user.id)
        .gte('date', firstDay)
        .lte('date', lastDay)
        .order('date')
      if (error) throw error

      type AttRow = { date: string; status: string; class_schedules: { class_code: string } | null }
      for (const row of (data ?? []) as AttRow[]) {
        days.push({ date: row.date, status: row.status, class_code: row.class_schedules?.class_code ?? undefined })
      }
    }

    const summary: MyAttendanceSummary = { present: 0, absent: 0, kp: 0, half: 0 }
    for (const day of days) {
      if (day.status === '1') summary.present++
      else if (day.status === '0') summary.absent++
      else if (day.status === 'KP') summary.kp++
      else if (day.status === '0.5') summary.half++
    }

    return { success: true, data: { days, summary } }
  } catch (err) {
    console.error('[getMyAttendance]', err)
    return { success: false, error: 'Không thể tải dữ liệu chấm công.' }
  }
}
