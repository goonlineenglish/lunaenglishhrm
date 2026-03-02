// Role badge component — color-coded badge for all 4 roles
// ADMIN=indigo, MANAGER=sky, TEACHER=emerald, TEACHING_ASSISTANT=amber

import { Badge } from '@/components/ui/badge';
import type { Role } from '@/lib/types/user';

const ROLE_BADGE_CLASSES: Record<Role, string> = {
  ADMIN: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  MANAGER: 'bg-sky-100 text-sky-800 border-sky-200',
  TEACHER: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  TEACHING_ASSISTANT: 'bg-amber-100 text-amber-800 border-amber-200',
};

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Quản lý',
  TEACHER: 'Giáo viên',
  TEACHING_ASSISTANT: 'Trợ giảng',
};

interface RoleBadgeProps {
  role: Role;
  className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={`${ROLE_BADGE_CLASSES[role]} ${className ?? ''}`}
    >
      {ROLE_LABELS[role]}
    </Badge>
  );
}
