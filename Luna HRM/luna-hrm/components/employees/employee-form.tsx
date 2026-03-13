'use client'

/**
 * Employee create/edit form in a Dialog.
 * Create mode: requires email + password. Edit mode: email read-only, no password.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert } from '@/components/ui/alert'
import { createEmployee, updateEmployee } from '@/lib/actions/employee-actions'
import { EmployeeFormFields, DEFAULT_FORM } from './employee-form-fields'
import type { FormData } from './employee-form-fields'
import type { Employee, Branch } from '@/lib/types/database'

interface EmployeeFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  employee?: Employee | null
  branches: Branch[]
  isAdmin?: boolean
  defaultBranchId?: string | null
}

export function EmployeeForm({
  open, onOpenChange, onSuccess, employee, branches, isAdmin = true, defaultBranchId,
}: EmployeeFormProps) {
  const isEdit = !!employee

  const [form, setForm] = useState<FormData>(() =>
    employee
      ? {
          employee_code: employee.employee_code,
          full_name: employee.full_name,
          email: employee.email,
          password: '',
          phone: employee.phone ?? '',
          position: employee.position,
          role: employee.role,
          branch_id: employee.branch_id ?? defaultBranchId ?? '',
          rate_per_session: String(employee.rate_per_session),
          sub_rate: employee.sub_rate ? String(employee.sub_rate) : '',
          has_labor_contract: employee.has_labor_contract,
          dependent_count: String(employee.dependent_count),
        }
      : { ...DEFAULT_FORM, branch_id: defaultBranchId ?? '' }
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(key: keyof FormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.employee_code.trim()) return setError('Mã nhân viên là bắt buộc.')
    if (!form.full_name.trim()) return setError('Họ tên là bắt buộc.')
    if (!isEdit && !form.email.trim()) return setError('Email là bắt buộc.')
    if (!isEdit && form.password.length < 8) return setError('Mật khẩu phải có ít nhất 8 ký tự.')

    setLoading(true)
    try {
      const payload = {
        full_name: form.full_name,
        phone: form.phone || null,
        position: form.position as Employee['position'],
        role: form.role as Employee['role'],
        branch_id: form.branch_id || null,
        rate_per_session: Number(form.rate_per_session),
        sub_rate: form.sub_rate ? Number(form.sub_rate) : 0,
        has_labor_contract: form.has_labor_contract,
        dependent_count: Number(form.dependent_count),
      }
      const result = isEdit && employee
        ? await updateEmployee(employee.id, payload)
        : await createEmployee({ ...payload, employee_code: form.employee_code, email: form.email, password: form.password })
      if (!result.success) return setError(result.error ?? 'Lỗi lưu nhân viên.')
      onSuccess()
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Sửa nhân viên' : 'Thêm nhân viên mới'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && <Alert variant="destructive"><p className="text-sm">{error}</p></Alert>}
          <EmployeeFormFields form={form} set={set} isEdit={isEdit} isAdmin={isAdmin} branches={branches} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Hủy</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Tạo nhân viên'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
