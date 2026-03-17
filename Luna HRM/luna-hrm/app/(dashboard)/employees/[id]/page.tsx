'use client'

/**
 * Employee detail page — profile header + tabbed content (info, evaluations, notes).
 * Multi-Role RBAC: admin can assign multiple roles via RoleAssignmentDialog.
 * URL: /employees/[id]
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, User, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmployeeForm } from '@/components/employees/employee-form'
import { EmployeeProfileTabs } from '@/components/employees/employee-profile-tabs'
import { RoleAssignmentDialog } from '@/components/employees/role-assignment-dialog'
import { getEmployeeById } from '@/lib/actions/employee-actions'
import { getBranches } from '@/lib/actions/branch-actions'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { POSITION_LABELS, ROLE_LABELS, ROLE_BADGE_COLORS } from '@/lib/constants/roles'
import type { EmployeeWithBranch } from '@/lib/actions/employee-actions'
import type { Branch, UserRole } from '@/lib/types/database'

export default function EmployeeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [employee, setEmployee] = useState<EmployeeWithBranch | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [viewerRoles, setViewerRoles] = useState<UserRole[]>(['employee'])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)

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
    if (user?.roles) setViewerRoles(user.roles as UserRole[])
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

  const isAdmin = viewerRoles.includes('admin')
  const canEdit = isAdmin || viewerRoles.includes('branch_manager')
  // Employee's current roles (fallback to [role] if roles not yet migrated)
  const employeeRoles: UserRole[] = (employee as EmployeeWithBranch & { roles?: UserRole[] }).roles
    ?? [employee.role]

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Quay lại
        </Button>
        <div className="flex gap-2">
          {/* Admin: role assignment button */}
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={() => setRoleDialogOpen(true)}>
              <Shield className="h-4 w-4 mr-1" /> Phân quyền
            </Button>
          )}
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4 mr-1" /> Sửa
            </Button>
          )}
        </div>
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
          <div>
            <p className="text-xs text-muted-foreground">Vai trò</p>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {employeeRoles.map(r => (
                <span
                  key={r}
                  className={`text-xs px-1.5 py-0.5 rounded font-medium ${ROLE_BADGE_COLORS[r]}`}
                >
                  {ROLE_LABELS[r]}
                </span>
              ))}
            </div>
          </div>
          <Field label="Chi nhánh" value={employee.branch_name ?? '—'} />
        </CardContent>
      </Card>

      {/* Tabbed content */}
      <EmployeeProfileTabs
        employee={employee}
        viewerRole={viewerRoles[0]}
        onEmployeeUpdated={fetchData}
      />

      <EmployeeForm
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={fetchData}
        employee={employee}
        branches={branches}
      />

      {/* Admin: Role Assignment Dialog */}
      {isAdmin && (
        <RoleAssignmentDialog
          open={roleDialogOpen}
          onOpenChange={setRoleDialogOpen}
          userId={employee.id}
          userName={employee.full_name}
          currentRoles={employeeRoles}
          branchId={employee.branch_id}
          onSuccess={fetchData}
        />
      )}
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
