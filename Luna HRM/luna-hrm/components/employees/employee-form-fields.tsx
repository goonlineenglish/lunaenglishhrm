'use client'

/**
 * Employee form field grid — extracted from employee-form.tsx.
 * Renders all input fields in a 2-column grid.
 */

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { POSITION_OPTIONS, ROLE_OPTIONS } from '@/lib/constants/roles'
import type { Branch } from '@/lib/types/database'

interface FormData {
  employee_code: string
  full_name: string
  email: string
  password: string
  phone: string
  position: string
  role: string
  branch_id: string
  rate_per_session: string
  sub_rate: string
  has_labor_contract: boolean
  dependent_count: string
}

interface Props {
  form: FormData
  set: (key: keyof FormData, value: string | boolean) => void
  isEdit: boolean
  isAdmin: boolean
  branches: Branch[]
}

export type { FormData }

export const DEFAULT_FORM: FormData = {
  employee_code: '', full_name: '', email: '', password: '', phone: '',
  position: 'teacher', role: 'employee', branch_id: '',
  rate_per_session: '0', sub_rate: '', has_labor_contract: false, dependent_count: '0',
}

export function EmployeeFormFields({ form, set, isEdit, isAdmin, branches }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1">
        <Label htmlFor="employee_code">Mã nhân viên *</Label>
        <Input id="employee_code" value={form.employee_code} onChange={(e) => set('employee_code', e.target.value)} placeholder="T-TM01" disabled={isEdit} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="full_name">Họ và tên *</Label>
        <Input id="full_name" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} placeholder="Nguyễn Văn A" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="email">Email *</Label>
        <Input id="email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="nhanvien@luna.edu.vn" disabled={isEdit} />
      </div>
      {!isEdit && (
        <div className="space-y-1">
          <Label htmlFor="password">Mật khẩu *</Label>
          <Input id="password" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Tối thiểu 8 ký tự" />
        </div>
      )}
      <div className="space-y-1">
        <Label htmlFor="phone">Số điện thoại</Label>
        <Input id="phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="0901234567" />
      </div>
      <div className="space-y-1">
        <Label>Vị trí *</Label>
        <Select value={form.position} onValueChange={(v) => set('position', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {POSITION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {isAdmin && (
        <>
          <div className="space-y-1">
            <Label>Vai trò *</Label>
            <Select value={form.role} onValueChange={(v) => set('role', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Chi nhánh</Label>
            <Select value={form.branch_id} onValueChange={(v) => set('branch_id', v)}>
              <SelectTrigger><SelectValue placeholder="Chọn chi nhánh" /></SelectTrigger>
              <SelectContent>
                {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </>
      )}
      <div className="space-y-1">
        <Label htmlFor="rate_per_session">Lương/buổi (VND) *</Label>
        <Input id="rate_per_session" type="number" min="0" value={form.rate_per_session} onChange={(e) => set('rate_per_session', e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="sub_rate">Lương dạy thay (VND)</Label>
        <Input id="sub_rate" type="number" min="0" value={form.sub_rate} onChange={(e) => set('sub_rate', e.target.value)} placeholder="Để trống nếu không" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="dependent_count">Số người phụ thuộc</Label>
        <Input id="dependent_count" type="number" min="0" value={form.dependent_count} onChange={(e) => set('dependent_count', e.target.value)} />
      </div>
      <div className="flex items-center gap-2 pt-4">
        <input id="has_labor_contract" type="checkbox" checked={form.has_labor_contract} onChange={(e) => set('has_labor_contract', e.target.checked)} className="h-4 w-4 rounded border-input" />
        <Label htmlFor="has_labor_contract" className="cursor-pointer">Có hợp đồng lao động</Label>
      </div>
    </div>
  )
}
