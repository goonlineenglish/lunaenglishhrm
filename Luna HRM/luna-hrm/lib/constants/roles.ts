/**
 * Role and position display labels + badge colors used throughout the UI.
 */

import type { UserRole, EmployeePosition } from '@/lib/types/database'

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Quản trị viên',
  branch_manager: 'Quản lý cơ sở',
  accountant: 'Kế toán',
  employee: 'Nhân viên',
}

export const ROLE_BADGE_COLORS: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-800',
  branch_manager: 'bg-blue-100 text-blue-800',
  accountant: 'bg-green-100 text-green-800',
  employee: 'bg-gray-100 text-gray-800',
}

export const POSITION_LABELS: Record<EmployeePosition, string> = {
  teacher: 'Giáo viên',
  assistant: 'Trợ giảng',
  office: 'Nhân viên VP',
  admin: 'Quản trị',
}

export const POSITION_OPTIONS: { value: EmployeePosition; label: string }[] = [
  { value: 'teacher', label: 'Giáo viên' },
  { value: 'assistant', label: 'Trợ giảng' },
  { value: 'office', label: 'Nhân viên VP' },
  { value: 'admin', label: 'Quản trị' },
]

export const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Quản trị viên' },
  { value: 'branch_manager', label: 'Quản lý cơ sở' },
  { value: 'accountant', label: 'Kế toán' },
  { value: 'employee', label: 'Nhân viên' },
]
