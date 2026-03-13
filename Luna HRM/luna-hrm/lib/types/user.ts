/**
 * User and session-related types derived from Supabase Auth + app_metadata.
 * These are used throughout the app for role-based access control.
 */

import type { UserRole, EmployeePosition } from './database'

// ─── Auth User (from Supabase session) ───────────────────────────────────────

export interface AppMetadata {
  role: UserRole
  branch_id: string | null
}

export interface AuthUser {
  id: string
  email: string
  app_metadata: AppMetadata
}

// ─── Session User (combined auth + employee data) ────────────────────────────

export interface SessionUser {
  id: string
  email: string
  full_name: string
  role: UserRole
  position: EmployeePosition
  branch_id: string | null
  branch_name: string | null
  is_active: boolean
}

// ─── Role permission helpers ─────────────────────────────────────────────────

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Quản trị viên',
  branch_manager: 'Quản lý cơ sở',
  accountant: 'Kế toán',
  employee: 'Nhân viên',
}

export const POSITION_LABELS: Record<EmployeePosition, string> = {
  teacher: 'Giáo viên',
  assistant: 'Trợ giảng',
  office: 'Nhân viên VP',
  admin: 'Quản trị',
}

/** Returns true if user can access all branches */
export function isGlobalRole(role: UserRole): boolean {
  return role === 'admin' || role === 'accountant'
}

/** Returns true if user manages a specific branch */
export function isBranchScoped(role: UserRole): boolean {
  return role === 'branch_manager'
}

/** Returns true if user can manage payroll */
export function canManagePayroll(role: UserRole): boolean {
  return role === 'admin' || role === 'accountant'
}

/** Returns true if user can manage employees */
export function canManageEmployees(role: UserRole): boolean {
  return role === 'admin' || role === 'branch_manager'
}

/** Returns true if user can manage class schedules */
export function canManageSchedules(role: UserRole): boolean {
  return role === 'admin' || role === 'branch_manager'
}

/** Returns true if user can view KPI evaluations */
export function canViewKpi(role: UserRole): boolean {
  return role === 'admin' || role === 'branch_manager'
}
