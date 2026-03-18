'use client'

/**
 * Class-based attendance page — admin + branch_manager.
 * Weekly grid with auto-fill, save, lock, diff view.
 * Tab "Tổng hợp" shows per-employee per-class session counts.
 * URL: /attendance
 */

import { useState, useEffect, useCallback } from 'react'
import { ClipboardCheck } from 'lucide-react'
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
  const [summaryError, setSummaryError] = useState<string | null>(null)

  // Detect role on mount — if BM, branchId is derived server-side from JWT
  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user?.role === 'admin') setIsAdmin(true)
      if (user?.roles?.[0]) setUserRole(user.roles[0])
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
    setSummaryError(null)
    try {
      const month = weekStart.getMonth() + 1
      const year = weekStart.getFullYear()
      const res = await getAttendanceSummary(branchId, toISODate(weekStart), month, year)
      if (res.success && res.data) {
        setSummaryItems(res.data.items)
      } else {
        setSummaryItems([])
        setSummaryError(res.error ?? 'Lỗi tải tổng hợp công.')
      }
    } catch {
      setSummaryItems([])
      setSummaryError('Lỗi tải tổng hợp công.')
    } finally {
      setSummaryLoading(false)
    }
  }, [weekStart, branchId, isAdmin])

  // Single trigger for summary fetch — covers both:
  //   1. Tab switch to 'summary' (activeTab changes)
  //   2. Week/branch change while already on 'summary' tab
  // No fetchSummary() call in onValueChange — avoids double-fetch (ISSUE-1 fix)
  useEffect(() => {
    if (activeTab === 'summary') fetchSummary()
  }, [activeTab, fetchSummary])  

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          <h1 className="text-xl font-bold">Chấm công</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <BranchSelector value={branchId} onChange={(id) => { setBranchId(id); setData(null); setSummaryItems([]); setSummaryError(null) }} />
          )}
          <AttendanceWeekSelector
            weekStart={weekStart}
            isLocked={data?.isLocked ?? false}
            onWeekChange={(d) => { setWeekStart(d); setSummaryItems([]); setSummaryError(null) }}
          />        </div>
      </div>

      {isAdmin && !branchId && (
        <div className="text-center py-8 text-muted-foreground border rounded-md">
          Chọn chi nhánh để xem chấm công.
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(val) => {
        setActiveTab(val as 'grid' | 'summary')
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
          {summaryError && (
            <Alert variant="destructive" className="mb-3"><p>{summaryError}</p></Alert>
          )}
          <AttendanceSummaryCards items={summaryItems} loading={summaryLoading} />
        </TabsContent>
      </Tabs>
    </div>
  )
}