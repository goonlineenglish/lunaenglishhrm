/**
 * Employee self-service: monthly attendance calendar.
 * Read-only. Month/year selector. Color-coded grid.
 * Employee role only — redirects others to /dashboard.
 */

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { getMyAttendance } from '@/lib/actions/employee-portal-actions'
import { getMyAttendanceSummary } from '@/lib/actions/attendance-summary-actions'
import { EmployeeAttendanceCalendar } from '@/components/attendance/employee-attendance-calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MonthYearPicker } from '@/components/shared/month-year-picker'

interface PageProps {
  searchParams: Promise<{ month?: string; year?: string }>
}

export default async function MyAttendancePage({ searchParams }: PageProps) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'employee') redirect('/dashboard')

  const params = await searchParams
  const now = new Date()
  const month = params.month ? parseInt(params.month, 10) : now.getMonth() + 1
  const year = params.year ? parseInt(params.year, 10) : now.getFullYear()

  const result = await getMyAttendance(month, year)
  const attendanceData = result.data ?? { days: [], summary: { present: 0, absent: 0, kp: 0, half: 0 } }

  // Class breakdown for teaching staff — explicit month/year (ISSUE-9 fix)
  const summaryResult = await getMyAttendanceSummary(month, year)
  const summaryItems = summaryResult.data?.items ?? []
  const myClasses = summaryItems[0]?.month_classes ?? []

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('vi-VN', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div>
        <h1 className="text-xl font-bold">Chấm công của tôi</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{monthLabel}</p>
      </div>

      {/* Month selector */}
      <MonthYearPicker month={month} year={year} basePath="/my-attendance" />

      {result.error && (
        <p className="text-sm text-destructive">{result.error}</p>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Lịch chấm công</CardTitle>
        </CardHeader>
        <CardContent>
          <EmployeeAttendanceCalendar
            days={attendanceData.days}
            month={month}
            year={year}
          />
        </CardContent>
      </Card>

      {/* Summary row */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-4 text-center gap-2">
            <div>
              <p className="text-2xl font-bold text-green-600">{attendanceData.summary.present}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Có mặt</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-500">{attendanceData.summary.absent}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Vắng phép</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-500">{attendanceData.summary.kp}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Vắng KP</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-500">{attendanceData.summary.half}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Nửa buổi</p>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Class breakdown — teaching staff only (VP staff have empty myClasses[]) */}
      {myClasses.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Công theo lớp — Tháng {month}/{year}</CardTitle>
          </CardHeader>
          <CardContent>
            {myClasses.map((cls) => (
              <div key={cls.class_code} className="flex justify-between py-1 border-b last:border-0">
                <span className="text-sm">{cls.class_code} ({cls.class_name})</span>
                <span className="text-sm font-medium">{cls.sessions} công</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 font-bold text-sm">
              <span>Tổng tháng</span>
              <span>{summaryItems[0]?.total_month ?? 0} công</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
