// Role permissions service — centralized permission map for all 4 roles

import type { Role } from '@/lib/types/user';

// Permission map: key = action, value = roles that can perform it
const PERMISSIONS: Record<string, Role[]> = {
  'users:crud': ['ADMIN'],
  'programs:crud': ['ADMIN'],
  'courses:crud': ['ADMIN'],
  'courses:view_basic': ['ADMIN', 'MANAGER', 'TEACHER', 'TEACHING_ASSISTANT'],
  'courses:view_advanced': ['ADMIN', 'TEACHER'],
  'lesson_plans:create': ['TEACHER', 'TEACHING_ASSISTANT'],
  'lesson_plans:export': ['TEACHER'],
  'lesson_plan_templates:view': ['ADMIN', 'MANAGER', 'TEACHER', 'TEACHING_ASSISTANT'],
  'reports:view_all': ['ADMIN'],
  'reports:view_school': ['MANAGER'],
  'progress:track': ['MANAGER', 'TEACHER', 'TEACHING_ASSISTANT'],
  'favorites:toggle': ['ADMIN', 'MANAGER', 'TEACHER', 'TEACHING_ASSISTANT'],
};

/**
 * Check if a role has a specific permission.
 * Returns false for unknown permissions.
 */
export function hasPermission(role: Role, permission: string): boolean {
  return PERMISSIONS[permission]?.includes(role) ?? false;
}
