// DashboardHeader — top header with page title, user name, role badge, and mobile menu toggle
// Server-renderable (no interactivity); logout is in sidebar

import { RoleBadge } from '@/components/shared/role-badge';
import type { Role } from '@/lib/types/user';

interface DashboardHeaderProps {
  userName: string;
  userRole: Role;
  title?: string;
}

export function DashboardHeader({ userName, userRole, title = 'Dashboard' }: DashboardHeaderProps) {
  return (
    <header className="h-14 border-b border-neutral-200 bg-white flex items-center justify-between px-6 shrink-0">
      <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
      <div className="flex items-center gap-3">
        <span className="text-sm text-neutral-600 hidden sm:block">{userName}</span>
        <RoleBadge role={userRole} />
      </div>
    </header>
  );
}
