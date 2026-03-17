/**
 * Database entity types: Branches, Employees + enum types
 * Part 1 of 4 — see database-schedule-types, database-payroll-types, database-evaluation-types
 * MUST match supabase/migrations/001_create_all_tables.sql
 */

// ─── Enums / Branded Types ───────────────────────────────────────────────────

export type UserRole = 'admin' | 'branch_manager' | 'accountant' | 'employee'

export type EmployeePosition = 'teacher' | 'assistant' | 'office' | 'admin'

/** 1=present, 0=absent w/ permission, KP=absent no permission, 0.5=half day */
export type AttendanceStatus = '1' | '0' | 'KP' | '0.5'

export type NoteType = 'substitute' | 'bonus' | 'penalty' | 'extra_job' | 'general'

export type ClassStatus = 'active' | 'inactive'

// ─── 1. branches ─────────────────────────────────────────────────────────────

export interface Branch {
  id: string
  name: string
  address: string | null
  phone: string | null
  manager_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type BranchInsert = Omit<Branch, 'id' | 'created_at' | 'updated_at'>
export type BranchUpdate = Partial<BranchInsert>

// ─── 2. employees ────────────────────────────────────────────────────────────

export interface Employee {
  id: string                    // = auth.users.id (same UUID)
  branch_id: string | null
  employee_code: string
  full_name: string
  email: string
  phone: string | null
  position: EmployeePosition
  /** Legacy single-role (deprecated — use roles[] for multi-role RBAC) */
  role: UserRole
  /** Multi-role array (migration 014+) */
  roles: UserRole[]
  rate_per_session: number      // VND per session (BIGINT in DB)
  sub_rate: number              // substitute rate (BIGINT in DB)
  has_labor_contract: boolean
  dependent_count: number
  is_active: boolean
  join_date: string | null
  // Extended profile fields
  date_of_birth: string | null
  id_number: string | null
  id_issue_date: string | null
  id_issue_place: string | null
  address: string | null
  emergency_contact: string | null
  bank_account_number: string | null
  bank_name: string | null
  nationality: string | null
  qualifications: string | null
  teaching_license: string | null
  characteristics: string | null
  created_at: string
  updated_at: string
}

export type EmployeeInsert = Omit<Employee, 'created_at' | 'updated_at'>
export type EmployeeUpdate = Partial<Omit<EmployeeInsert, 'id'>>
