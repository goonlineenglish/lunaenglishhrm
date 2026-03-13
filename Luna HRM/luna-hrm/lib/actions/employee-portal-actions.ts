/**
 * Employee portal actions — barrel re-export.
 * Split into attendance (self-service) + payslip (self-service).
 */

export type { ActionResult, MyAttendanceDay, MyAttendanceSummary, MyAttendanceData } from './employee-portal-attendance-actions'
export { getMyAttendance } from './employee-portal-attendance-actions'

export type { MyPayslipSummary, MyPayslipDetail } from './employee-portal-payslip-actions'
export { getMyPayslips, getMyPayslipDetail } from './employee-portal-payslip-actions'
