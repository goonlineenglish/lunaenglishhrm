'use client'

/**
 * Class-based attendance page — admin + branch_manager.
 * Weekly grid with auto-fill, save, lock, diff view.
 * Tab "Tổng hợp" shows per-employee per-class session counts.
 * URL: /attendance
 */

import { useState, useEffect, useCallback } from 'react'
import { ClipboardCheck, AlertTriangle } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { BranchSelector } from '@/components/shared/branch-selector'
import { AttendanceWeekSelector } from '@/components/attendance/attendance-week-selector'
import { AttendanceLegend } from '@/components/attendance/attendance-legend'
import { AttendanceGrid } from '@/components/attendance/attendance-grid'
import { AttendanceSummary } from '@/components/attendance/attendance-summary'
import { AttendanceNotesPanel } from '@/components/attendance/attendance-notes-panel'
import { AttendanceSummaryCards } from '@/components/attendance/attendance-summary-cards'
import { getAttendanceGrid, type AttendanceGridData } from '@/lib/actions/attendance-actions'
import { getAttendanceSummary } from '@/lib/actions/attendance-summary-actions'
import { getWeeklyNotes, type NoteWithEmployee } from '@/lib/actions/weekly-notes-actions'
import { getWeekStart, toISODate } from '@/lib/utils/date-helpers'
import type { ScheduleConflict } from '@/lib/services/attendance-grid-service'
import { getDayName } from '@/lib/utils/date-helpers'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import type { AttendanceSummaryItem } from '@/lib/types/attendance-summary-types'

export default function AttendancePage() {
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()))
  const [branchId, setBranchId] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [userRole, setUserRole] = useState<string>('')
  const [roleLoaded, setRoleLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState<'grid' | 'summary'>('grid')
  const [data, setData] = useState<AttendanceGridData | null>(null)
  const [notes, setNotes] = useState<NoteWithEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Summary tab state — only fetched when tab is mounted (no forceMount = lazy render)
  const [summaryItems, setSummaryItems] = useState<AttendanceSummaryItem[]>([])
  const [summaryLoading, setSummaryLoading] = useState(false)

  // Detect role on mount — if BM, branchId is derived server-side from JWT
  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user?.role === 'admin') setIsAdmin(true)
      if (user?.role) setUserRole(user.role)
      setRoleLoaded(true)
    })
  }, [])

  const fetchGrid = useCallback(async () => {
    // ISSUE-4 fix: admin must select branch before loading
    if (isAdmin && !branchId) {
      setData(null)
      setNotes([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const dateStr = toISODate(weekStart)
    const [gridResult, notesResult] = await Promise.all([
      getAttendanceGrid(branchId, dateStr),
      getWeeklyNotes(branchId, dateStr),
    ])
    if (gridResult.success && gridResult.data) {
      setData(gridResult.data)
    } else {
      setError(gridResult.error ?? 'Lỗi tải chấm công.')
    }
    if (notesResult.success) setNotes(notesResult.data ?? [])
    setLoading(false)
  }, [weekStart, branchId, isAdmin])

  useEffect(() => { if (roleLoaded) fetchGrid() }, [fetchGrid, roleLoaded])

  /** Fetch summary when "Tổng hợp" tab mounts (called from onValueChange) */
  const fetchSummary = useCallback(async () => {
    if (isAdmin && !branchId) return
    setSummaryLoading(true)
    const month = weekStart.getMonth() + 1
    const year = weekStart.getFullYear()
    const res = await getAttendanceSummary(branchId, toISODate(weekStart), month, year)
    if (res.success && res.data) setSummaryItems(res.data.items)
    setSummaryLoading(false)
  }, [weekStart, branchId, isAdmin])

  // ISSUE-2 fix: re-fetch when branch/week changes while summary tab is active
  useEffect(() => {
    if (activeTab === 'summary') fetchSummary()
  }, [weekStart, branchId]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          <h1 className="text-xl font-bold">Chấm công</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <BranchSelector value={branchId} onChange={(id) => { setBranchId(id); setData(null); setSummaryItems([]) }} />
          )}
          <AttendanceWeekSelector
            weekStart={weekStart}
            isLocked={data?.isLocked ?? false}
            onWeekChange={(d) => { setWeekStart(d); setSummaryItems([]) }}
          />        </div>
      </div>

      {isAdmin && !branchId && (
        <div className="text-center py-8 text-muted-foreground border rounded-md">
          Chọn chi nhánh để xem chấm công.
        </div>
      )}

      {/* Conflict warnings */}
      {data?.conflicts && data.conflicts.length > 0 && (
        <ConflictBanner conflicts={data.conflicts} />
      )}

      <Tabs value={activeTab} onValueChange={(val) => {
        const tab = val as 'grid' | 'summary'
        setActiveTab(tab)
        if (tab === 'summary') fetchSummary()
      }}>
        <TabsList>
          <TabsTrigger value="grid">Chấm công</TabsTrigger>
          <TabsTrigger value="summary">Tổng hợp</TabsTrigger>
        </TabsList>

        {/* Grid tab — existing content, no forceMount needed */}
        <TabsContent value="grid" className="mt-3">
          <AttendanceLegend />
          {loading && (isAdmin ? !!branchId : true) && <LoadingSpinner />}
          {error && <Alert variant="destructive"><p>{error}</p></Alert>}
          {!loading && data && (
            <>
              <AttendanceGrid
                initialRows={data.rows}
                branchId={branchId}
                weekStart={weekStart}
                isLocked={data.isLocked}
                lockType={data.lockType}
                hasOverride={data.hasOverride}
                userRole={userRole}
                onSaved={fetchGrid}
              />
              <AttendanceSummary summary={data.summary} />
              <AttendanceNotesPanel
                notes={notes}
                branchId={branchId}
                weekStart={toISODate(weekStart)}
                isAccountant={false}
                onRefresh={fetchGrid}
              />
            </>
          )}
        </TabsContent>

        {/* Summary tab — no forceMount: only fetches when active (ISSUE-8 fix) */}
        <TabsContent value="summary" className="mt-3">
          <AttendanceSummaryCards items={summaryItems} loading={summaryLoading} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ConflictBanner({ conflicts }: { conflicts: ScheduleConflict[] }) {
  return (
    <Alert variant="destructive">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 mt-0.5" />
        <div>
          <p className="font-medium text-sm">Xung đột lịch ({conflicts.length})</p>
          <ul className="text-xs mt-1 space-y-0.5">
            {conflicts.slice(0, 5).map((c, i) => (
              <li key={i}>
                {c.employeeCode} ({c.employeeName}) — {getDayName(c.day)} ca {c.shiftTime}: {c.classes.join(' & ')}
              </li>
            ))}
            {conflicts.length > 5 && <li>... và {conflicts.length - 5} xung đột khác</li>}
          </ul>
        </div>
      </div>
    </Alert>
  )
}