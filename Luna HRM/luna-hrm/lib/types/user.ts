/**
 * User and session-related types derived from Supabase Auth + app_metadata.
 * Multi-Role RBAC: app_metadata.roles is now string[] (was single role string).
 * Backward-compat: app_metadata.role still present for legacy transition period.
 */

import type { UserRole, EmployeePosition } from './database'

// ─── Auth User (from Supabase session) ───────────────────────────────────────

export interface AppMetadata {
  /** Legacy single-role field — kept for backward compat, read roles[] first */
  role?: UserRole
  /** Multi-role array — PRIMARY source of truth (set by admin API) */
  roles?: UserRole[]
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
  /** Primary role (first entry in roles[]) — kept for display & backward compat */
  role: UserRole
  /** All roles assigned to user */
  roles: UserRole[]
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

/** Check if user has a specific role */
export function hasRole(user: Pick<SessionUser, 'roles'>, role: UserRole): boolean {
  return user.roles.includes(role)
}

/** Check if user has any of the given roles */
export function hasAnyRole(user: Pick<SessionUser, 'roles'>, ...roles: UserRole[]): boolean {
  return roles.some(r => user.roles.includes(r))
}

/**
 * Global access: admin always global.
 * Accountant is global UNLESS they also have branch_manager role (branch-scoped then).
 * Matches is_global_access() SQL function in migration 014.
 */
export function isGlobalAccess(user: Pick<SessionUser, 'roles'>): boolean {
  return hasRole(user, 'admin') || (hasRole(user, 'accountant') && !hasRole(user, 'branch_manager'))
}

/** Returns true if user can access all branches (any global role) */
export function isGlobalRole(user: Pick<SessionUser, 'roles'> | UserRole): boolean {
  if (typeof user === 'string') {
    // Legacy: single role string passed
    return user === 'admin' || user === 'accountant'
  }
  return isGlobalAccess(user)
}

/** Returns true if user manages a specific branch (has BM but not admin) */
export function isBranchScoped(user: Pick<SessionUser, 'roles'> | UserRole): boolean {
  if (typeof user === 'string') return user === 'branch_manager'
  return hasRole(user, 'branch_manager') && !hasRole(user, 'admin')
}

/** Returns true if user can manage payroll */
export function canManagePayroll(user: Pick<SessionUser, 'roles'> | UserRole): boolean {
  if (typeof user === 'string') return user === 'admin' || user === 'accountant'
  return hasAnyRole(user, 'admin', 'accountant')
}

/** Returns true if user can manage employees */
export function canManageEmployees(user: Pick<SessionUser, 'roles'> | UserRole): boolean {
  if (typeof user === 'string') return user === 'admin' || user === 'branch_manager'
  return hasAnyRole(user, 'admin', 'branch_manager')
}

/** Returns true if user can manage class schedules */
export function canManageSchedules(user: Pick<SessionUser, 'roles'> | UserRole): boolean {
  if (typeof user === 'string') return user === 'admin' || user === 'branch_manager'
  return hasAnyRole(user, 'admin', 'branch_manager')
}

/** Returns true if user can view KPI evaluations */
export function canViewKpi(user: Pick<SessionUser, 'roles'> | UserRole): boolean {
  if (typeof user === 'string') return user === 'admin' || user === 'branch_manager'
  return hasAnyRole(user, 'admin', 'branch_manager')
}
