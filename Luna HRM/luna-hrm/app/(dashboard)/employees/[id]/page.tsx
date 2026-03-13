'use client'

/**
 * Employee detail page — profile header + tabbed content (info, evaluations, notes).
 * URL: /employees/[id]
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmployeeForm } from '@/components/employees/employee-form'
import { EmployeeProfileTabs } from '@/components/employees/employee-profile-tabs'
import { getEmployeeById } from '@/lib/actions/employee-actions'
import { getBranches } from '@/lib/actions/branch-actions'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { POSITION_LABELS, ROLE_LABELS } from '@/lib/constants/roles'
import type { EmployeeWithBranch } from '@/lib/actions/employee-actions'
import type { Branch } from '@/lib/types/database'
import type { UserRole } from '@/lib/types/database-core-types'

export default function EmployeeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [employee, setEmployee] = useState<EmployeeWithBranch | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [viewerRole, setViewerRole] = useState<UserRole>('employee')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [empResult, branchResult, user] = await Promise.all([
      getEmployeeById(id),
      getBranches(),
      getCurrentUser(),
    ])
    if (!empResult.success) setError(empResult.error ?? 'Không tìm thấy nhân viên.')
    else setEmployee(empResult.data ?? null)
    if (branchResult.success) setBranches(branchResult.data ?? [])
    if (user?.role) setViewerRole(user.role as UserRole)
    setLoading(false)
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <LoadingSpinner />
  if (error || !employee) return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Quay lại
      </Button>
      <Alert variant="destructive"><p>{error ?? 'Không tìm thấy nhân viên.'}</p></Alert>
    </div>
  )

  const canEdit = viewerRole === 'admin' || viewerRole === 'branch_manager'

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Quay lại
        </Button>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-1" /> Sửa
          </Button>
        )}
      </div>

      {/* Profile summary card */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 pb-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <User className="h-6 w-6" />
          </div>
          <div>
            <CardTitle>{employee.full_name}</CardTitle>
            <p className="text-sm text-muted-foreground">{employee.email}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="text-xs hidden sm:flex">
              {POSITION_LABELS[employee.position]}
            </Badge>
            <Badge variant={employee.is_active ? 'default' : 'secondary'}>
              {employee.is_active ? 'Hoạt động' : 'Vô hiệu'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm pt-0">
          <Field label="Mã NV" value={employee.employee_code} />
          <Field label="Vai trò" value={ROLE_LABELS[employee.role]} />
          <Field label="Chi nhánh" value={employee.branch_name ?? '—'} />
        </CardContent>
      </Card>

      {/* Tabbed content */}
      <EmployeeProfileTabs
        employee={employee}
        viewerRole={viewerRole}
        onEmployeeUpdated={fetchData}
      />

      <EmployeeForm
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={fetchData}
        employee={employee}
        branches={branches}
      />
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium mt-0.5">{value}</p>
    </div>
  )
}
