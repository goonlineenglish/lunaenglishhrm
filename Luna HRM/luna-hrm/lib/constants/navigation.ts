/**
 * Navigation items for the sidebar.
 * Multi-Role RBAC: each item specifies which roles can see it.
 * Union menu: user sees union of all items matching ANY of their roles.
 */

import type { UserRole } from '@/lib/types/database'

export interface NavItem {
  label: string
  href: string
  icon: string
  /** User needs ANY ONE of these roles to see this item */
  roles: UserRole[]
}

export const ALL_NAV_ITEMS: NavItem[] = [
  {
    label: 'Trang chủ',
    href: '/dashboard',
    icon: 'Home',
    roles: ['admin', 'branch_manager', 'accountant', 'employee'],
  },
  {
    label: 'Lịch lớp',
    href: '/class-schedules',
    icon: 'Calendar',
    roles: ['admin', 'branch_manager'],
  },
  {
    label: 'Chấm công',
    href: '/attendance',
    icon: 'ClipboardCheck',
    roles: ['admin', 'branch_manager'],
  },
  {
    label: 'Chấm công VP',
    href: '/office-attendance',
    icon: 'Building',
    roles: ['admin', 'branch_manager'],
  },
  {
    label: 'Tính lương',
    href: '/payroll',
    icon: 'DollarSign',
    roles: ['admin', 'accountant'],
  },
  {
    label: 'KPI Trợ giảng',
    href: '/kpi',
    icon: 'Star',
    roles: ['admin', 'branch_manager'],
  },
  {
    label: 'Nhân viên',
    href: '/employees',
    icon: 'Users',
    roles: ['admin', 'branch_manager'],
  },
  {
    label: 'Chi nhánh',
    href: '/branches',
    icon: 'Building2',
    roles: ['admin'],
  },
  {
    label: 'Mẫu đánh giá',
    href: '/evaluation-templates',
    icon: 'ClipboardList',
    roles: ['admin'],
  },
  {
    label: 'Kỳ đánh giá',
    href: '/evaluation-periods',
    icon: 'CalendarRange',
    roles: ['admin'],
  },
  // Employee self-service portal items
  {
    label: 'Chấm công của tôi',
    href: '/my-attendance',
    icon: 'CalendarCheck',
    roles: ['employee'],
  },
  {
    label: 'Phiếu lương',
    href: '/my-payslips',
    icon: 'Wallet',
    roles: ['employee'],
  },
  {
    label: 'Hồ sơ của tôi',
    href: '/my-profile',
    icon: 'User',
    roles: ['employee'],
  },
  {
    label: 'KPI của tôi',
    href: '/my-kpi',
    icon: 'TrendingUp',
    roles: ['employee'],
  },
]

/**
 * Filter nav items for a user with multiple roles.
 * Union menu: show item if user has ANY of the required roles.
 * Deduplicates by href to prevent duplicate entries.
 */
export function getNavItemsForRoles(userRoles: UserRole[]): NavItem[] {
  const seen = new Set<string>()
  return ALL_NAV_ITEMS.filter((item) => {
    if (seen.has(item.href)) return false
    const visible = item.roles.some(r => userRoles.includes(r))
    if (visible) seen.add(item.href)
    return visible
  })
}

/** Legacy: single-role filter — use getNavItemsForRoles() for multi-role */
export function getNavItemsForRole(role: UserRole): NavItem[] {
  return getNavItemsForRoles([role])
}
