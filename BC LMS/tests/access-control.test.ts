import { describe, it, expect } from 'vitest';
import { canAccessCourseLevel } from '@/lib/services/access-control-service';
import type { Role } from '@/lib/types/user';

describe('Access Control Service', () => {
  describe('canAccessCourseLevel', () => {
    it('should allow all roles to access BASIC courses', () => {
      expect(canAccessCourseLevel('ADMIN', 'BASIC')).toBe(true);
      expect(canAccessCourseLevel('MANAGER', 'BASIC')).toBe(true);
      expect(canAccessCourseLevel('TEACHER', 'BASIC')).toBe(true);
      expect(canAccessCourseLevel('TEACHING_ASSISTANT', 'BASIC')).toBe(true);
    });

    it('should allow only ADMIN and TEACHER to access ADVANCED courses', () => {
      expect(canAccessCourseLevel('ADMIN', 'ADVANCED')).toBe(true);
      expect(canAccessCourseLevel('TEACHER', 'ADVANCED')).toBe(true);
    });

    it('should deny MANAGER from accessing ADVANCED courses', () => {
      expect(canAccessCourseLevel('MANAGER', 'ADVANCED')).toBe(false);
    });

    it('should deny TEACHING_ASSISTANT from accessing ADVANCED courses', () => {
      expect(canAccessCourseLevel('TEACHING_ASSISTANT', 'ADVANCED')).toBe(false);
    });

    it('should evaluate CourseLevel gate correctly for mixed roles', () => {
      // BASIC: all can access
      const basicAllowed = ['ADMIN', 'MANAGER', 'TEACHER', 'TEACHING_ASSISTANT'].every(
        (role) => canAccessCourseLevel(role as Role, 'BASIC')
      );
      expect(basicAllowed).toBe(true);

      // ADVANCED: only ADMIN and TEACHER
      const advancedAdmin = canAccessCourseLevel('ADMIN', 'ADVANCED');
      const advancedTeacher = canAccessCourseLevel('TEACHER', 'ADVANCED');
      const advancedManager = canAccessCourseLevel('MANAGER', 'ADVANCED');
      const advancedTA = canAccessCourseLevel('TEACHING_ASSISTANT', 'ADVANCED');

      expect(advancedAdmin && advancedTeacher).toBe(true);
      expect(!advancedManager && !advancedTA).toBe(true);
    });
  });
});
