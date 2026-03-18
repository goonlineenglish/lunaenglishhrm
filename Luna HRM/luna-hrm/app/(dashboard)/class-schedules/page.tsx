'use client'

/**
 * Class schedules management page — admin + branch_manager.
 * Lists class schedules with create/edit/deactivate.
 * Admin must select a branch first (BranchSelector pattern, same as attendance/kpi/payroll).
 * URL: /class-schedules
 */

import { useState, useEffect, useCallback } from 'react'
import { Plus, Calendar, FileSpreadsheet, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { BranchSelector } from '@/components/shared/branch-selector'
import { ClassScheduleTable } from '@/components/class-schedules/class-schedule-table'
import { ClassScheduleForm } from '@/components/class-schedules/class-schedule-form'
import { ExcelImportDialog } from '@/components/class-schedules/excel-import-dialog'
import { ScheduleConflictBanner } from '@/components/class-schedules/schedule-conflict-banner'
import {
  getClassSchedules, deactivateClassSchedule, reactivateClassSchedule,
} from '@/lib/actions/class-schedule-actions'
import { getScheduleConflicts } from '@/lib/actions/schedule-conflict-actions'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import type { ClassSchedule } from '@/lib/types/database'
import type { ScheduleConflict } from '@/lib/services/attendance-grid-helpers'

export default function ClassSchedulesPage() {
  const [schedules, setSchedules] = useState<(ClassSchedule & { teacher_name: string; assistant_name: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editSchedule, setEditSchedule] = useState<ClassSchedule | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([])
  const [conflictError, setConflictError] = useState(false)

  // Admin branch selection state (same pattern as attendance/kpi/payroll pages)
  const [branchId, setBranchId] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [roleLoaded, setRoleLoaded] = useState(false)

  // Detect role on mount — if BM, branchId is derived server-side from JWT
  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user?.role === 'admin') setIsAdmin(true)
      setRoleLoaded(true)
    })
  }, [])

  const fetchData = useCallback(async () => {
    // Admin must select branch before loading
    if (isAdmin && !branchId) {
      setSchedules([])
      setConflicts([])
      setConflictError(false)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const [result, conflictResult] = await Promise.all([
      getClassSchedules(branchId || undefined),
      getScheduleConflicts(branchId || undefined),
    ])
    if (result.success) setSchedules(result.data ?? [])
    else setError(result.error ?? 'Lỗi tải dữ liệu.')
    if (conflictResult.success) {
      setConflicts(conflictResult.data ?? [])
      setConflictError(false)
    } else {
      setConflicts([])
      setConflictError(true)
    }
    setLoading(false)
  }, [branchId, isAdmin])

  useEffect(() => {
    if (roleLoaded) fetchData()
  }, [fetchData, roleLoaded])

  function openCreate() {
    setEditSchedule(null)
    setDialogOpen(true)
  }

  function openEdit(schedule: ClassSchedule) {
    setEditSchedule(schedule)
    setDialogOpen(true)
  }

  async function handleDeactivate(id: string) {
    if (!confirm('Bạn có chắc muốn ngừng lớp này?')) return
    const result = await deactivateClassSchedule(id)
    if (!result.success) alert(result.error ?? 'Lỗi ngừng lớp.')
    else fetchData()
  }

  async function handleReactivate(id: string) {
    if (!confirm('Bạn có chắc muốn mở lại lớp này?')) return
    const result = await reactivateClassSchedule(id)
    if (!result.success) alert(result.error ?? 'Lỗi mở lại lớp.')
    else fetchData()
  }

  if (!roleLoaded) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <h1 className="text-xl font-bold">Lịch lớp</h1>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <BranchSelector
              value={branchId}
              onChange={(id) => { setBranchId(id); setSchedules([]); setConflicts([]); setConflictError(false); setError(null) }}
            />
          )}
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} disabled={isAdmin && !branchId}>
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            Nhập Excel
          </Button>
          <Button onClick={openCreate} size="sm" disabled={isAdmin && !branchId}>
            <Plus className="h-4 w-4 mr-1" />
            Thêm lớp
          </Button>
        </div>
      </div>

      {isAdmin && !branchId && (
        <Alert>
          <Info className="h-4 w-4" />
          <p className="text-sm ml-2">Chọn chi nhánh để xem và quản lý lịch lớp.</p>
        </Alert>
      )}

      {error && <Alert variant="destructive"><p>{error}</p></Alert>}

      {/* Schedule conflict warnings (amber/informational) */}
      {!loading && (conflicts.length > 0 || conflictError) && (
        <ScheduleConflictBanner conflicts={conflicts} hasError={conflictError} />
      )}

      {loading && (isAdmin ? !!branchId : true) && <LoadingSpinner />}

      {!loading && !error && (isAdmin ? !!branchId : true) && (
        <ClassScheduleTable
          schedules={schedules}
          onEdit={openEdit}
          onDeactivate={handleDeactivate}
          onReactivate={handleReactivate}
        />
      )}

      <ClassScheduleForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editSchedule={editSchedule}
        branchId={branchId}
        onSaved={fetchData}
      />

      <ExcelImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        branchId={branchId}
        onImported={fetchData}
      />
    </div>
  )
}
