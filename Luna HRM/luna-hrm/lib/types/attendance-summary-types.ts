/** Per-class session count for one employee */
export interface ClassSessionSummary {
  class_code: string
  class_name: string
  sessions: number // supports 0.5 granularity
}

/** Aggregated attendance summary for one employee */
export interface AttendanceSummaryItem {
  employee_id: string
  employee_code: string
  full_name: string
  /** 'teacher' | 'assistant' | 'office' | 'admin' */
  position: string
  /** Current week class breakdown — for /attendance tab display */
  classes: ClassSessionSummary[]
  /** Full month class breakdown — for /my-attendance and /payroll panels */
  month_classes: ClassSessionSummary[]
  total_week: number
  total_month: number
}

/** Full response from getAttendanceSummary / getMyAttendanceSummary */
export interface AttendanceSummaryData {
  items: AttendanceSummaryItem[]
  week_start: string // ISO date YYYY-MM-DD
  month: number
  year: number
}
