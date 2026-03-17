/**
 * Dashboard layout: sidebar (desktop) + topnav + content area.
 * Redirects to /login if no authenticated user.
 * Employee role: renders BottomNav for mobile + pb-16 padding.
 */

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { SidebarNav } from '@/components/shared/sidebar-nav'
import { TopNavbar } from '@/components/shared/top-navbar'
import { BottomNav } from '@/components/shared/bottom-nav'
import type { SessionUser } from '@/lib/types/user'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const rawUser = await getCurrentUser()
  if (!rawUser) redirect('/login')

  // getCurrentUser returns object compatible with SessionUser shape
  // branch_name not returned by getCurrentUser, default null
  const user: SessionUser = {
    ...rawUser,
    role: rawUser.role as SessionUser['role'],
    roles: (rawUser.roles ?? [rawUser.role]) as SessionUser['roles'],
    position: rawUser.position as SessionUser['position'],
    branch_name: null,
    is_active: true,
  }

  // Show bottom nav only for pure employee (no other roles that grant management access)
  const isEmployee = user.roles.includes('employee') && user.roles.length === 1

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar — hidden on mobile */}
      <SidebarNav user={user} />

      {/* Main content column */}
      <div className="flex flex-1 flex-col min-w-0">
        <TopNavbar user={user} />
        {/* pb-16 on mobile gives space for bottom nav bar */}
        <main className={`flex-1 px-4 py-6 md:px-6 ${isEmployee ? 'pb-20 md:pb-6' : ''}`}>
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation for employee role only */}
      {isEmployee && <BottomNav />}
    </div>
  )
}
