'use client'

/**
 * Employees list page — admin and branch_manager.
 * URL: /employees
 */

import { useState, useEffect, useCallback } from 'react'
import { Plus, Users, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmployeeTable } from '@/components/employees/employee-table'
import { EmployeeForm } from '@/components/employees/employee-form'
import { EmployeeImportDialog } from '@/components/employees/employee-import-dialog'
import {
  getEmployees,
  updateEmployee,
  checkEmployeeClassAssignments,
} from '@/lib/actions/employee-actions'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { getBranches } from '@/lib/actions/branch-actions'
import type { EmployeeWithBranch } from '@/lib/actions/employee-actions'
import type { Branch } from '@/lib/types/database'

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeWithBranch[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [currentUserInfo, setCurrentUserInfo] = useState<{
    id: string
    role: string
    branchId: string | null
  } | null>(null)

  // Fetch current user info once on mount (for self-deactivation guard + import dialog)
  useEffect(() => {
    getCurrentUser().then((u) => {
      if (u) setCurrentUserInfo({ id: u.id, role: u.role, branchId: u.branch_id ?? null })
    })
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [empResult, branchResult] = await Promise.all([getEmployees(), getBranches()])
    if (!empResult.success) setError(empResult.error ?? 'Lỗi tải nhân viên.')
    else setEmployees(empResult.data ?? [])
    if (branchResult.success) setBranches(branchResult.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleToggleActive = useCallback(async (id: string, currentActive: boolean) => {
    const emp = employees.find((e) => e.id === id)
    if (!emp) return

    // Block self-deactivation (security guard)
    if (currentActive && id === currentUserInfo?.id) {
      alert('Không thể tự vô hiệu hóa tài khoản của mình.')
      return
    }

    // Check class assignments before deactivating — warn but allow proceed
    let warningMsg = ''
    if (currentActive) {
      const assignResult = await checkEmployeeClassAssignments(id)
      if (assignResult.success && assignResult.data && assignResult.data.length > 0) {
        warningMsg = `\n\n⚠️ Nhân viên đang được gán ${assignResult.data.length} lớp: ${assignResult.data.join(', ')}. Vui lòng cập nhật lịch lớp sau khi vô hiệu hóa.`
      }
    }

    const action = currentActive ? 'đánh dấu đã nghỉ' : 'kích hoạt lại'
    const confirmed = window.confirm(
      `Bạn có muốn ${action} nhân viên "${emp.full_name}"?${warningMsg}`
    )
    if (!confirmed) return

    const result = await updateEmployee(id, { is_active: !currentActive })
    if (result.success) {
      await fetchData()
    } else {
      alert(result.error ?? 'Lỗi cập nhật trạng thái nhân viên.')
    }
  }, [employees, currentUserInfo, fetchData])

  if (loading) return <LoadingSpinner />
  if (error) return <Alert variant="destructive"><p>{error}</p></Alert>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h1 className="text-xl font-bold">Nhân viên</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)} size="sm">
            <Upload className="h-4 w-4 mr-1" />
            Import Excel
          </Button>
          <Button onClick={() => setFormOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Thêm nhân viên
          </Button>
        </div>
      </div>

      <EmployeeTable
        employees={employees}
        branches={branches}
        showBranchFilter={branches.length > 1}
        onToggleActive={handleToggleActive}
      />

      <EmployeeForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={fetchData}
        branches={branches}
      />

      <EmployeeImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        branches={branches}
        userBranchId={currentUserInfo?.branchId ?? null}
        userRole={currentUserInfo?.role ?? ''}
        onImported={fetchData}
      />
    </div>
  )
}
