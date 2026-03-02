// Role gate component — conditionally renders children based on user role
// Use for client-side conditional rendering by role

import type { Role } from '@/lib/types/user';

interface RoleGateProps {
  allowedRoles: Role[];
  userRole: Role;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Renders children only if userRole is in allowedRoles.
 * Renders fallback (default null) otherwise.
 */
export function RoleGate({ allowedRoles, userRole, children, fallback = null }: RoleGateProps) {
  if (!allowedRoles.includes(userRole)) return <>{fallback}</>;
  return <>{children}</>;
}
