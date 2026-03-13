'use client'

/**
 * Employee profile tabs — Thông tin | Đánh giá | Ghi chú
 * Note tab hidden for employee role.
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { EmployeeProfileInfo } from '@/components/employees/employee-profile-info'
import { EmployeeNoteForm } from '@/components/employees/employee-note-form'
import { EmployeeNotesList } from '@/components/employees/employee-notes-list'
import { EvaluationHistoryList } from '@/components/evaluations/evaluation-history-list'
import { getEmployeeEvaluations } from '@/lib/actions/evaluation-actions'
import { getEmployeeNotes } from '@/lib/actions/employee-notes-actions'
import type { Employee, UserRole } from '@/lib/types/database-core-types'
import type { EvaluationListRow } from '@/lib/types/evaluation'
import type { EmployeeNote } from '@/lib/types/database-evaluation-types'

interface Props {
  employee: Employee
  viewerRole: UserRole
  onEmployeeUpdated: () => void
}

type NoteWithAuthor = EmployeeNote & { author_name?: string }

export function EmployeeProfileTabs({ employee, viewerRole, onEmployeeUpdated }: Props) {
  const router = useRouter()
  const showNotes = viewerRole === 'admin' || viewerRole === 'branch_manager'
  const canEvaluate = viewerRole === 'admin' || viewerRole === 'branch_manager'

  const [evaluations, setEvaluations] = useState<EvaluationListRow[]>([])
  const [notes, setNotes] = useState<NoteWithAuthor[]>([])
  const [evalLoading, setEvalLoading] = useState(false)
  const [notesLoading, setNotesLoading] = useState(false)

  const loadEvaluations = useCallback(async () => {
    setEvalLoading(true)
    const r = await getEmployeeEvaluations(employee.id)
    if (r.success && r.data) setEvaluations(r.data)
    setEvalLoading(false)
  }, [employee.id])

  const loadNotes = useCallback(async () => {
    if (!showNotes) return
    setNotesLoading(true)
    const r = await getEmployeeNotes(employee.id)
    if (r.success && r.data) setNotes(r.data)
    setNotesLoading(false)
  }, [employee.id, showNotes])

  useEffect(() => {
    loadEvaluations()
    loadNotes()
  }, [loadEvaluations, loadNotes])

  return (
    <Tabs defaultValue="info">
      <TabsList className="w-full justify-start">
        <TabsTrigger value="info">Thông tin</TabsTrigger>
        <TabsTrigger value="evaluations">Đánh giá</TabsTrigger>
        {showNotes && <TabsTrigger value="notes">Ghi chú</TabsTrigger>}
      </TabsList>

      <TabsContent value="info" className="mt-4">
        <EmployeeProfileInfo
          employee={employee}
          viewerRole={viewerRole}
          onUpdated={onEmployeeUpdated}
        />
      </TabsContent>

      <TabsContent value="evaluations" className="mt-4 space-y-3">
        {canEvaluate && (
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => router.push(`/employees/${employee.id}/evaluate`)}
            >
              <ClipboardList className="h-4 w-4 mr-1" /> Đánh giá mới
            </Button>
          </div>
        )}
        <EvaluationHistoryList evaluations={evaluations} loading={evalLoading} />
      </TabsContent>

      {showNotes && (
        <TabsContent value="notes" className="mt-4 space-y-4">
          <EmployeeNoteForm employeeId={employee.id} onSuccess={loadNotes} />
          <EmployeeNotesList notes={notes} loading={notesLoading} />
        </TabsContent>
      )}
    </Tabs>
  )
}
