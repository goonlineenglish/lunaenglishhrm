/**
 * Dashboard home page — role-based quick stats and welcome message.
 * Multi-Role RBAC: uses roles[] array for permission checks.
 * URL: /dashboard
 */

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { getBranches } from '@/lib/actions/branch-actions'
import { getEmployees } from '@/lib/actions/employee-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ROLE_LABELS } from '@/lib/constants/roles'
import { Users, Building2, ClipboardCheck, DollarSign } from 'lucide-react'

export default async function DashboardPage() {
  const rawUser = await getCurrentUser()
  if (!rawUser) redirect('/login')

  const roles = rawUser.roles ?? [rawUser.role]
  const isAdmin = roles.includes('admin')
  const isManager = roles.includes('branch_manager')
  const isAccountant = roles.includes('accountant')
  const isPureEmployee = roles.length === 1 && roles.includes('employee')
  const canManage = isAdmin || isManager || isAccountant

  // Fetch stats based on role
  const [branchesResult, employeesResult] = await Promise.all([
    getBranches(),
    getEmployees(),
  ])

  const branchCount = branchesResult.data?.length ?? 0
  const employeeCount = employeesResult.data?.length ?? 0
  const activeCount = employeesResult.data?.filter((e) => e.is_active).length ?? 0

  // Display label — show all roles if multi-role
  const roleLabel = roles.length > 1
    ? roles.map(r => ROLE_LABELS[r as keyof typeof ROLE_LABELS] ?? r).join(' + ')
    : (ROLE_LABELS[rawUser.role as keyof typeof ROLE_LABELS] ?? rawUser.role)

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold">Xin chào, {rawUser.full_name}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {roleLabel} — Luna HRM
        </p>
      </div>

      {/* Stats grid for management roles */}
      {canManage && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isAdmin && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Chi nhánh</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{branchCount}</p>
                <p className="text-xs text-muted-foreground">chi nhánh đang hoạt động</p>
              </CardContent>
            </Card>
          )}

          {(isAdmin || isManager) && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Nhân viên</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{employeeCount}</p>
                <p className="text-xs text-muted-foreground">{activeCount} đang hoạt động</p>
              </CardContent>
            </Card>
          )}

          {(isAdmin || isManager) && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Chấm công</CardTitle>
                <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">—</p>
                <p className="text-xs text-muted-foreground">tuần này</p>
              </CardContent>
            </Card>
          )}

          {(isAdmin || isAccountant) && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Lương tháng này</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">—</p>
                <p className="text-xs text-muted-foreground">chưa tính</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Employee self-service portal info */}
      {isPureEmployee && (
        <Card>
          <CardHeader>
            <CardTitle>Thông tin của bạn</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Xem lịch công tác, bảng lương và hồ sơ cá nhân tại menu bên trái.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
