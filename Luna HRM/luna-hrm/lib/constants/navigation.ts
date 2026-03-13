/**
 * Navigation items for the sidebar.
 * Each item includes the roles that can see it.
 */

import type { UserRole } from '@/lib/types/database'

export interface NavItem {
  label: string
  href: string
  icon: string
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
    label: 'Hồ sơ',
    href: '/my-profile',
    icon: 'User',
    roles: ['employee'],
  },
]

/** Filter nav items by user role */
export function getNavItemsForRole(role: UserRole): NavItem[] {
  return ALL_NAV_ITEMS.filter((item) => item.roles.includes(role))
}
