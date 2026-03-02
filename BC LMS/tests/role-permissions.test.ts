import { describe, it, expect } from 'vitest';
import { hasPermission } from '@/lib/services/role-permissions-service';

describe('Role Permissions Service', () => {
  describe('ADMIN role', () => {
    it('should have users:crud permission', () => {
      expect(hasPermission('ADMIN', 'users:crud')).toBe(true);
    });

    it('should have programs:crud permission', () => {
      expect(hasPermission('ADMIN', 'programs:crud')).toBe(true);
    });

    it('should have courses:crud permission', () => {
      expect(hasPermission('ADMIN', 'courses:crud')).toBe(true);
    });

    it('should have courses:view_advanced permission', () => {
      expect(hasPermission('ADMIN', 'courses:view_advanced')).toBe(true);
    });

    it('should have reports:view_all permission', () => {
      expect(hasPermission('ADMIN', 'reports:view_all')).toBe(true);
    });
  });

  describe('TEACHER role', () => {
    it('should NOT have users:crud permission', () => {
      expect(hasPermission('TEACHER', 'users:crud')).toBe(false);
    });

    it('should NOT have programs:crud permission', () => {
      expect(hasPermission('TEACHER', 'programs:crud')).toBe(false);
    });

    it('should have courses:view_advanced permission', () => {
      expect(hasPermission('TEACHER', 'courses:view_advanced')).toBe(true);
    });

    it('should have lesson_plans:create permission', () => {
      expect(hasPermission('TEACHER', 'lesson_plans:create')).toBe(true);
    });

    it('should have lesson_plans:export permission', () => {
      expect(hasPermission('TEACHER', 'lesson_plans:export')).toBe(true);
    });
  });

  describe('TEACHING_ASSISTANT role', () => {
    it('should NOT have users:crud permission', () => {
      expect(hasPermission('TEACHING_ASSISTANT', 'users:crud')).toBe(false);
    });

    it('should NOT have courses:view_advanced permission', () => {
      expect(hasPermission('TEACHING_ASSISTANT', 'courses:view_advanced')).toBe(false);
    });

    it('should have lesson_plans:create permission', () => {
      expect(hasPermission('TEACHING_ASSISTANT', 'lesson_plans:create')).toBe(true);
    });

    it('should NOT have lesson_plans:export permission', () => {
      expect(hasPermission('TEACHING_ASSISTANT', 'lesson_plans:export')).toBe(false);
    });

    it('should have courses:view_basic permission', () => {
      expect(hasPermission('TEACHING_ASSISTANT', 'courses:view_basic')).toBe(true);
    });
  });

  describe('MANAGER role', () => {
    it('should NOT have users:crud permission', () => {
      expect(hasPermission('MANAGER', 'users:crud')).toBe(false);
    });

    it('should NOT have courses:view_advanced permission', () => {
      expect(hasPermission('MANAGER', 'courses:view_advanced')).toBe(false);
    });

    it('should have reports:view_school permission', () => {
      expect(hasPermission('MANAGER', 'reports:view_school')).toBe(true);
    });

    it('should have progress:track permission', () => {
      expect(hasPermission('MANAGER', 'progress:track')).toBe(true);
    });

    it('should NOT have lesson_plans:export permission', () => {
      expect(hasPermission('MANAGER', 'lesson_plans:export')).toBe(false);
    });
  });

  describe('unknown permissions', () => {
    it('should return false for unknown permission', () => {
      expect(hasPermission('ADMIN', 'unknown:action')).toBe(false);
    });

    it('should return false for unknown permission for all roles', () => {
      expect(hasPermission('TEACHER', 'nonexistent:perm')).toBe(false);
      expect(hasPermission('MANAGER', 'nonexistent:perm')).toBe(false);
      expect(hasPermission('TEACHING_ASSISTANT', 'nonexistent:perm')).toBe(false);
    });
  });

  describe('permission consistency', () => {
    it('all roles should have courses:view_basic', () => {
      expect(hasPermission('ADMIN', 'courses:view_basic')).toBe(true);
      expect(hasPermission('MANAGER', 'courses:view_basic')).toBe(true);
      expect(hasPermission('TEACHER', 'courses:view_basic')).toBe(true);
      expect(hasPermission('TEACHING_ASSISTANT', 'courses:view_basic')).toBe(true);
    });

    it('ADMIN and TEACHER should have courses:view_advanced', () => {
      expect(hasPermission('ADMIN', 'courses:view_advanced')).toBe(true);
      expect(hasPermission('TEACHER', 'courses:view_advanced')).toBe(true);
    });

    it('MANAGER and TEACHING_ASSISTANT should NOT have courses:view_advanced', () => {
      expect(hasPermission('MANAGER', 'courses:view_advanced')).toBe(false);
      expect(hasPermission('TEACHING_ASSISTANT', 'courses:view_advanced')).toBe(false);
    });
  });
});
