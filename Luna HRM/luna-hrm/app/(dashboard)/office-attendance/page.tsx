'use client'

/**
 * Office attendance page — VP staff daily grid.
 * URL: /office-attendance
 */

import { useState, useEffect, useCallback } from 'react'
import { Building } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { BranchSelector } from '@/components/shared/branch-selector'
import { AttendanceWeekSelector } from '@/components/attendance/attendance-week-selector'
import { AttendanceLegend } from '@/components/attendance/attendance-legend'
import { OfficeAttendanceGrid } from '@/components/office-attendance/office-attendance-grid'
import { getOfficeAttendanceGrid } from '@/lib/actions/office-attendance-actions'
import { getWeekStart, toISODate } from '@/lib/utils/date-helpers'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import type { OfficeGridData } from '@/lib/actions/office-attendance-actions'

export default function OfficeAttendancePage() {
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()))
  const [branchId, setBranchId] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [userRole, setUserRole] = useState<string>('')
  const [roleLoaded, setRoleLoaded] = useState(false)
  const [data, setData] = useState<OfficeGridData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user?.role === 'admin') setIsAdmin(true)
      if (user?.role) setUserRole(user.role)
      setRoleLoaded(true)
    })
  }, [])

  const fetchGrid = useCallback(async () => {
    // ISSUE-4 fix: admin must select a branch
    if (isAdmin && !branchId) {
      setData(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const dateStr = toISODate(weekStart)
    const result = await getOfficeAttendanceGrid(branchId, dateStr)
    if (result.success && result.data) {
      setData(result.data)
    } else {
      setError(result.error ?? 'Lỗi tải chấm công VP.')
    }
    setLoading(false)
  }, [weekStart, branchId, isAdmin])

  useEffect(() => { if (roleLoaded) fetchGrid() }, [fetchGrid, roleLoaded])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          <h1 className="text-xl font-bold">Chấm công VP</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <BranchSelector value={branchId} onChange={(id) => { setBranchId(id); setData(null) }} />
          )}
          <AttendanceWeekSelector
            weekStart={weekStart}
            isLocked={data?.isLocked ?? false}
            onWeekChange={setWeekStart}
          />
        </div>
      </div>

      <AttendanceLegend />

      {isAdmin && !branchId && (
        <div className="text-center py-8 text-muted-foreground border rounded-md">
          Chọn chi nhánh để xem chấm công VP.
        </div>
      )}

      {loading && (isAdmin ? !!branchId : true) && <LoadingSpinner />}
      {error && <Alert variant="destructive"><p>{error}</p></Alert>}

      {!loading && data && (
        <OfficeAttendanceGrid
          initialRows={data.rows}
          branchId={branchId}
          weekStart={weekStart}
          isLocked={data.isLocked}
          lockType={data.lockType}
          hasOverride={data.hasOverride}
          userRole={userRole}
          onSaved={fetchGrid}
        />
      )}
    </div>
  )
}
