'use client'

/**
 * Class schedules management page — admin + branch_manager.
 * Lists class schedules with create/edit/deactivate.
 * URL: /class-schedules
 */

import { useState, useEffect, useCallback } from 'react'
import { Plus, Calendar, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { ClassScheduleTable } from '@/components/class-schedules/class-schedule-table'
import { ClassScheduleForm } from '@/components/class-schedules/class-schedule-form'
import { ExcelImportDialog } from '@/components/class-schedules/excel-import-dialog'
import {
  getClassSchedules, deactivateClassSchedule, reactivateClassSchedule,
} from '@/lib/actions/class-schedule-actions'
import type { ClassSchedule } from '@/lib/types/database'

export default function ClassSchedulesPage() {
  const [schedules, setSchedules] = useState<(ClassSchedule & { teacher_name: string; assistant_name: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editSchedule, setEditSchedule] = useState<ClassSchedule | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const result = await getClassSchedules()
    if (result.success) setSchedules(result.data ?? [])
    else setError(result.error ?? 'Lỗi tải dữ liệu.')
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

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

  if (loading) return <LoadingSpinner />
  if (error) return <Alert variant="destructive"><p>{error}</p></Alert>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <h1 className="text-xl font-bold">Lịch lớp</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            Nhập Excel
          </Button>
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Thêm lớp
          </Button>
        </div>
      </div>

      <ClassScheduleTable
        schedules={schedules}
        onEdit={openEdit}
        onDeactivate={handleDeactivate}
        onReactivate={handleReactivate}
      />

      <ClassScheduleForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editSchedule={editSchedule}
        branchId=""
        onSaved={fetchData}
      />

      <ExcelImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        branchId=""
        onImported={fetchData}
      />
    </div>
  )
}
