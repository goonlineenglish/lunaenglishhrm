'use client'

/**
 * Employees list page — admin and branch_manager.
 * URL: /employees
 */

import { useState, useEffect, useCallback } from 'react'
import { Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmployeeTable } from '@/components/employees/employee-table'
import { EmployeeForm } from '@/components/employees/employee-form'
import { getEmployees } from '@/lib/actions/employee-actions'
import { getBranches } from '@/lib/actions/branch-actions'
import type { EmployeeWithBranch } from '@/lib/actions/employee-actions'
import type { Branch } from '@/lib/types/database'

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeWithBranch[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)

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

  if (loading) return <LoadingSpinner />
  if (error) return <Alert variant="destructive"><p>{error}</p></Alert>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h1 className="text-xl font-bold">Nhân viên</h1>
        </div>
        <Button onClick={() => setFormOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Thêm nhân viên
        </Button>
      </div>

      <EmployeeTable
        employees={employees}
        branches={branches}
        showBranchFilter={branches.length > 1}
      />

      <EmployeeForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={fetchData}
        branches={branches}
      />
    </div>
  )
}
