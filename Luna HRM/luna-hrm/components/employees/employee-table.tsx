'use client'

/**
 * Employee data table with search + filter by position/branch/status.
 * Clicking a row navigates to /employees/[id].
 * Optional onToggleActive prop enables inline active/inactive toggle button.
 */

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, UserX, UserCheck } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { POSITION_LABELS, ROLE_LABELS, ROLE_BADGE_COLORS } from '@/lib/constants/roles'
import type { EmployeeWithBranch } from '@/lib/actions/employee-actions'
import type { Branch } from '@/lib/types/database'

interface EmployeeTableProps {
  employees: EmployeeWithBranch[]
  branches: Branch[]
  /** Show branch filter — admin only */
  showBranchFilter?: boolean
  /** Callback to toggle is_active on a given employee */
  onToggleActive?: (id: string, currentActive: boolean) => Promise<void>
}

export function EmployeeTable({
  employees,
  branches,
  showBranchFilter = false,
  onToggleActive,
}: EmployeeTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [positionFilter, setPositionFilter] = useState('all')
  const [branchFilter, setBranchFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active')

  // Suppress unused-variable warning — useCallback kept for future memoised handlers
  const handleRowClick = useCallback(
    (id: string) => router.push(`/employees/${id}`),
    [router]
  )

  const filtered = employees.filter((emp) => {
    const matchSearch =
      emp.full_name.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase())
    const matchPosition = positionFilter === 'all' || emp.position === positionFilter
    const matchBranch = branchFilter === 'all' || emp.branch_id === branchFilter
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && emp.is_active) ||
      (statusFilter === 'inactive' && !emp.is_active)
    return matchSearch && matchPosition && matchBranch && matchStatus
  })

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên hoặc email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={positionFilter} onValueChange={setPositionFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Vị trí" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả vị trí</SelectItem>
            <SelectItem value="teacher">Giáo viên</SelectItem>
            <SelectItem value="assistant">Trợ giảng</SelectItem>
            <SelectItem value="office">Nhân viên VP</SelectItem>
            <SelectItem value="admin">Quản trị</SelectItem>
          </SelectContent>
        </Select>

        {showBranchFilter && (
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Chi nhánh" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả chi nhánh</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Status filter */}
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'active' | 'inactive' | 'all')}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Hoạt động</SelectItem>
            <SelectItem value="inactive">Đã nghỉ</SelectItem>
            <SelectItem value="all">Tất cả</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Họ tên</TableHead>
              <TableHead>Vị trí</TableHead>
              <TableHead>Chi nhánh</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-16">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Không tìm thấy nhân viên nào.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((emp) => (
                <TableRow
                  key={emp.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(emp.id)}
                >
                  <TableCell className="font-medium">{emp.full_name}</TableCell>
                  <TableCell>{POSITION_LABELS[emp.position]}</TableCell>
                  <TableCell>{emp.branch_name ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{emp.email}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_BADGE_COLORS[emp.role]}`}>
                      {ROLE_LABELS[emp.role]}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={emp.is_active ? 'default' : 'secondary'}>
                      {emp.is_active ? 'Hoạt động' : 'Đã nghỉ'}
                    </Badge>
                  </TableCell>
                  {/* Stop row-click propagation so button click doesn't navigate */}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {onToggleActive && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title={emp.is_active ? 'Đánh dấu đã nghỉ' : 'Kích hoạt lại'}
                        onClick={() => onToggleActive(emp.id, emp.is_active)}
                      >
                        {emp.is_active
                          ? <UserX className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          : <UserCheck className="h-4 w-4 text-muted-foreground hover:text-green-600" />
                        }
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">Hiển thị {filtered.length}/{employees.length} nhân viên</p>
    </div>
  )
}
