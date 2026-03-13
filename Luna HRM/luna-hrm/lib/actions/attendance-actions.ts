/**
 * Attendance actions — barrel re-export.
 * Split into query (read grid) + save (batch save, lock) + lock management.
 */

export type { ActionResult, AttendanceGridData } from './attendance-query-actions'
export { getAttendanceGrid } from './attendance-query-actions'

export type { AttendanceSaveItem } from './attendance-save-actions'
export { saveAttendanceBatch, lockWeek } from './attendance-save-actions'

export { unlockWeek, overrideAutoLock, removeOverride } from './attendance-lock-actions'

export type { AttendanceSummaryData } from '@/lib/types/attendance-summary-types'
export { getAttendanceSummary, getMyAttendanceSummary } from './attendance-summary-actions'
