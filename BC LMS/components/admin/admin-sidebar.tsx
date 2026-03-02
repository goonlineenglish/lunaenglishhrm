'use client';

// Admin sidebar navigation — links for Users, Programs, Courses + logout
// Shows brand, user email, and active link indicator

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Users, BookOpen, GraduationCap, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AdminSidebarProps {
  userEmail: string;
  userName: string;
}

const NAV_ITEMS = [
  { href: '/admin/users', label: 'Người dùng', icon: Users },
  { href: '/admin/programs', label: 'Chương trình', icon: BookOpen },
  { href: '/admin/courses', label: 'Khóa học', icon: GraduationCap },
];

export function AdminSidebar({ userEmail, userName }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    try {
      const csrfToken = document.cookie
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
        <p className="text-xs text-neutral-400 mt-0.5">Admin Panel</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Điều hướng admin">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
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
      </nav>

      {/* User info + logout */}
      <div className="px-4 py-4 border-t border-neutral-700">
        <p className="text-xs text-neutral-400 truncate" title={userEmail}>{userEmail}</p>
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
