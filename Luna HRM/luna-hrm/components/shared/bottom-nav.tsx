'use client'

/**
 * Bottom tab navigation for employee role on mobile (md:hidden).
 * 4 tabs: Home, Attendance, Payslips, Profile.
 * Fixed at bottom of screen with safe-area padding.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, CalendarCheck, Wallet, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BottomNavTab {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const EMPLOYEE_TABS: BottomNavTab[] = [
  { label: 'Trang chủ', href: '/dashboard', icon: Home },
  { label: 'Chấm công', href: '/my-attendance', icon: CalendarCheck },
  { label: 'Phiếu lương', href: '/my-payslips', icon: Wallet },
  { label: 'Hồ sơ', href: '/my-profile', icon: User },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch h-16">
        {EMPLOYEE_TABS.map((tab) => {
          const Icon = tab.icon
          const isActive =
            tab.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(tab.href)

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 min-h-[48px] transition-colors',
                isActive
                  ? 'text-[#3E1A51]'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 shrink-0',
                  isActive && 'stroke-[2.5]'
                )}
              />
              <span className="text-[10px] font-medium leading-none">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
