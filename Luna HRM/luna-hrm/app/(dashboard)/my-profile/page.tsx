/**
 * Employee self-service: own profile view (read-only).
 * Displays personal info, job info, and bank details.
 * Employee role only.
 */

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { getEmployeeById } from '@/lib/actions/employee-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { POSITION_LABELS, ROLE_LABELS } from '@/lib/types/user'
import type { EmployeePosition, UserRole } from '@/lib/types/database'

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 py-2">
      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide shrink-0">
        {label}
      </span>
      <span className="text-sm text-right">{value || '—'}</span>
    </div>
  )
}

export default async function MyProfilePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (!user.roles?.includes("employee")) redirect('/dashboard')

  // Employee can call getEmployeeById with their own ID
  // The action checks RLS; for employee role it allows reading own profile
  const result = await getEmployeeById(user.id)
  const emp = result.data

  if (!emp) {
    return (
      <div className="max-w-lg mx-auto">
        <h1 className="text-xl font-bold mb-4">Hồ sơ của tôi</h1>
        <p className="text-sm text-destructive">{result.error ?? 'Không thể tải hồ sơ.'}</p>
      </div>
    )
  }

  const positionLabel = POSITION_LABELS[emp.position as EmployeePosition] ?? emp.position
  const roleLabel = ROLE_LABELS[emp.role as UserRole] ?? emp.role

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div>
        <h1 className="text-xl font-bold">Hồ sơ của tôi</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{emp.full_name}</p>
      </div>

      {/* Personal info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Thông tin cá nhân
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0 pt-0">
          <InfoRow label="Họ và tên" value={emp.full_name} />
          <Separator />
          <InfoRow label="Ngày sinh" value={emp.date_of_birth ?? undefined} />
          <Separator />
          <InfoRow label="Số CCCD" value={emp.id_number ?? undefined} />
          <Separator />
          <InfoRow label="Điện thoại" value={emp.phone ?? undefined} />
          <Separator />
          <InfoRow label="Email" value={emp.email} />
          <Separator />
          <InfoRow label="Địa chỉ" value={emp.address ?? undefined} />
          <Separator />
          <InfoRow label="Liên hệ khẩn cấp" value={emp.emergency_contact ?? undefined} />
        </CardContent>
      </Card>

      {/* Job info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Thông tin công việc
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0 pt-0">
          <InfoRow label="Mã nhân viên" value={emp.employee_code} />
          <Separator />
          <InfoRow label="Vị trí" value={positionLabel} />
          <Separator />
          <InfoRow label="Vai trò" value={roleLabel} />
          <Separator />
          <InfoRow label="Chi nhánh" value={emp.branch_name ?? undefined} />
          <Separator />
          <InfoRow label="Ngày vào làm" value={emp.join_date ?? undefined} />
          <Separator />
          <InfoRow label="Bằng cấp" value={emp.qualifications ?? undefined} />
        </CardContent>
      </Card>

      {/* Bank info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Thông tin ngân hàng
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0 pt-0">
          <InfoRow label="Ngân hàng" value={emp.bank_name ?? undefined} />
          <Separator />
          <InfoRow label="Số tài khoản" value={emp.bank_account_number ?? undefined} />
        </CardContent>
      </Card>
    </div>
  )
}
