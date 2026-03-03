'use client';

// DashboardSidebar — role-aware navigation sidebar for dashboard users
// Shows different nav items per role; active link highlighted

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, BookOpen, FileText, BarChart2, ShieldCheck, LogOut, User } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Role } from '@/lib/types/user';

interface DashboardSidebarProps {
  role: Role;
  userName: string;
  userEmail: string;
}

// Nav items are fixed; role-conditional items shown dynamically below
const BASE_NAV = [
  { href: '/dashboard', label: 'Trang chủ', icon: LayoutDashboard },
];

const ROLE_NAV: Partial<Record<Role, { href: string; label: string; icon: typeof LayoutDashboard }[]>> = {
  ADMIN: [
    { href: '/admin', label: 'Admin Panel', icon: ShieldCheck },
  ],
  MANAGER: [
    { href: '/reports', label: 'Báo cáo', icon: BarChart2 },
  ],
  TEACHER: [
    { href: '/lesson-plans', label: 'Kế hoạch dạy học', icon: FileText },
  ],
  TEACHING_ASSISTANT: [
    { href: '/lesson-plans', label: 'Kế hoạch dạy học', icon: FileText },
  ],
};

export function DashboardSidebar({ role, userName, userEmail }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const extraNav = ROLE_NAV[role] ?? [];
  const navItems = [...BASE_NAV, ...extraNav];

  async function handleLogout() {
    try {
      const csrfToken =
        document.cookie
          .split('; ')
          .find((c) => c.startsWith('csrf-token='))
          ?.split('=')[1] ?? '';

      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'X-CSRF-Token': csrfToken },
      });
      router.push('/login');
    } catch {
      toast.error('Đăng xuất thất bại, vui lòng thử lại');
    }
  }

  return (
    <aside className="w-60 bg-neutral-900 text-white flex flex-col shrink-0">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-neutral-700">
        <h1 className="text-lg font-bold tracking-tight">
          <span className="text-indigo-400">Buttercup</span> LMS
        </h1>
        <p className="text-xs text-neutral-400 mt-0.5">
          {role === 'MANAGER' ? 'Quản lý' : role === 'TEACHING_ASSISTANT' ? 'Trợ giảng' : 'Dashboard'}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Điều hướng dashboard">
        {navItems.map(({ href, label, icon: Icon }) => {
          // Exact match for /dashboard; prefix match for others
          const isActive = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}

        {/* Course browser link */}
        <Link
          href="/courses"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
            pathname.startsWith('/courses')
              ? 'bg-indigo-600 text-white'
              : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
          )}
        >
          <BookOpen className="h-4 w-4 shrink-0" />
          Khóa học
        </Link>

        {/* Profile link */}
        <Link
          href="/profile"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
            pathname === '/profile'
              ? 'bg-indigo-600 text-white'
              : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
          )}
        >
          <User className="h-4 w-4 shrink-0" />
          Hồ sơ
        </Link>
      </nav>

      {/* User info + logout */}
      <div className="px-4 py-4 border-t border-neutral-700">
        <p className="text-xs font-medium text-neutral-200 truncate">{userName}</p>
        <p className="text-xs text-neutral-400 truncate mt-0.5" title={userEmail}>{userEmail}</p>
        <button
          onClick={handleLogout}
          className="mt-3 flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors w-full"
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
