/**
 * Dashboard home page — role-based quick stats and welcome message.
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
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  // Fetch stats based on role
  const [branchesResult, employeesResult] = await Promise.all([
    getBranches(),
    getEmployees(),
  ])

  const branchCount = branchesResult.data?.length ?? 0
  const employeeCount = employeesResult.data?.length ?? 0
  const activeCount = employeesResult.data?.filter((e) => e.is_active).length ?? 0

  const isAdmin = user.role === 'admin'
  const isManager = user.role === 'branch_manager'

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold">Xin chào, {user.full_name}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS]} — Luna HRM
        </p>
      </div>

      {/* Stats grid */}
      {(isAdmin || isManager) && (
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

          {(isAdmin || user.role === 'accountant') && (
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

      {/* Employee self-service */}
      {user.role === 'employee' && (
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
