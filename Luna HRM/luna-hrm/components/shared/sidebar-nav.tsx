'use client'

/**
 * Desktop sidebar navigation — hidden on mobile (hidden md:flex).
 * Renders role-filtered nav items with active state highlight.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, Calendar, ClipboardCheck, Building, DollarSign,
  Star, Users, Building2, CalendarCheck, Wallet, User,
  ClipboardList, CalendarRange,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getNavItemsForRole } from '@/lib/constants/navigation'
import type { SessionUser } from '@/lib/types/user'

// Map icon string → Lucide component
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Home, Calendar, ClipboardCheck, Building, DollarSign, Star, Users, Building2,
  CalendarCheck, Wallet, User, ClipboardList, CalendarRange,
}

interface SidebarNavProps {
  user: SessionUser
}

export function SidebarNav({ user }: SidebarNavProps) {
  const pathname = usePathname()
  const navItems = getNavItemsForRole(user.role)

  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-sidebar-border">
        <span className="text-lg font-bold tracking-tight">Luna HRM</span>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
        {navItems.map((item) => {
          const Icon = ICON_MAP[item.icon] ?? Home
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User info at bottom */}
      <div className="px-4 py-4 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-foreground/70 truncate">{user.full_name}</p>
        <p className="text-xs text-sidebar-foreground/50 truncate">{user.email}</p>
      </div>
    </aside>
  )
}
