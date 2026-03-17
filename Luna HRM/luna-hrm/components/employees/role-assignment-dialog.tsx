'use client'

/**
 * Role Assignment Dialog — Admin only.
 * Allows assigning multiple roles to an employee via checkboxes.
 * Updates both app_metadata.roles[] and employees.roles[].
 */

import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { updateUserRoles } from '@/lib/actions/auth-actions'
import { ROLE_LABELS, ROLE_BADGE_COLORS } from '@/lib/constants/roles'
import type { UserRole } from '@/lib/types/database'

const ASSIGNABLE_ROLES: UserRole[] = ['admin', 'branch_manager', 'accountant', 'employee']

interface RoleAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  userName: string
  currentRoles: UserRole[]
  branchId: string | null
  onSuccess: () => void
}

export function RoleAssignmentDialog({
  open,
  onOpenChange,
  userId,
  userName,
  currentRoles,
  branchId,
  onSuccess,
}: RoleAssignmentDialogProps) {
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>(currentRoles)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ISSUE-6 fix: reset selection when dialog opens or target user changes
  useEffect(() => {
    if (open) {
      setSelectedRoles(currentRoles)
      setError(null)
    }
  }, [open, userId, currentRoles])

  function toggleRole(role: UserRole) {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    )
  }

  async function handleSave() {
    if (selectedRoles.length === 0) {
      setError('Phải chọn ít nhất 1 vai trò.')
      return
    }
    setSaving(true)
    setError(null)
    const result = await updateUserRoles(userId, selectedRoles, branchId)
    setSaving(false)
    if (!result.success) {
      setError(result.error ?? 'Cập nhật thất bại.')
      return
    }
    onSuccess()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Phân quyền — {userName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Chọn vai trò cho nhân viên này. Có thể chọn nhiều vai trò cùng lúc.
          </p>

          {/* Current roles display */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs text-muted-foreground">Hiện tại:</span>
            {currentRoles.map(r => (
              <Badge key={r} className={ROLE_BADGE_COLORS[r]} variant="secondary">
                {ROLE_LABELS[r]}
              </Badge>
            ))}
          </div>

          {/* Role toggle buttons */}
          <div className="space-y-2 border rounded-md p-3">
            {ASSIGNABLE_ROLES.map((role) => {
              const isSelected = selectedRoles.includes(role)
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleRole(role)}
                  className={`w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm text-left transition-colors border ${
                    isSelected
                      ? 'border-primary bg-primary/5 font-medium'
                      : 'border-transparent hover:bg-muted'
                  }`}
                >
                  <span
                    className={`h-4 w-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                      isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
                    }`}
                  >
                    {isSelected && (
                      <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <span>
                    <span className="font-medium">{ROLE_LABELS[role]}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {role === 'admin' && '(toàn hệ thống)'}
                      {role === 'branch_manager' && '(quản lý chi nhánh)'}
                      {role === 'accountant' && '(xem + tính lương)'}
                      {role === 'employee' && '(nhân viên thường)'}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          {/* Warning for admin role */}
          {selectedRoles.includes('admin') && !currentRoles.includes('admin') && (
            <Alert variant="destructive">
              <p className="text-sm">⚠️ Quyền admin cho phép truy cập toàn bộ hệ thống.</p>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <p className="text-sm">{error}</p>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={saving || selectedRoles.length === 0}>
            {saving ? 'Đang lưu...' : 'Lưu vai trò'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
