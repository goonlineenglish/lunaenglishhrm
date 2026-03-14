import { describe, it, expect } from 'vitest';
import { hasPermission } from '@/lib/services/role-permissions-service';

describe('Material Permissions', () => {
  describe('materials:upload', () => {
    it('ADMIN can upload materials', () => {
      expect(hasPermission('ADMIN', 'materials:upload')).toBe(true);
    });

    it('TEACHER cannot upload materials', () => {
      expect(hasPermission('TEACHER', 'materials:upload')).toBe(false);
    });

    it('MANAGER cannot upload materials', () => {
      expect(hasPermission('MANAGER', 'materials:upload')).toBe(false);
    });

    it('TEACHING_ASSISTANT cannot upload materials', () => {
      expect(hasPermission('TEACHING_ASSISTANT', 'materials:upload')).toBe(false);
    });

    it('only ADMIN has materials:upload permission', () => {
      const roles = ['ADMIN', 'TEACHER', 'MANAGER', 'TEACHING_ASSISTANT'] as const;
      const hasPermissions = roles.map(role => hasPermission(role, 'materials:upload'));
      expect(hasPermissions).toEqual([true, false, false, false]);
    });
  });

  describe('materials:delete', () => {
    it('ADMIN can delete materials', () => {
      expect(hasPermission('ADMIN', 'materials:delete')).toBe(true);
    });

    it('TEACHER cannot delete materials', () => {
      expect(hasPermission('TEACHER', 'materials:delete')).toBe(false);
    });

    it('MANAGER cannot delete materials', () => {
      expect(hasPermission('MANAGER', 'materials:delete')).toBe(false);
    });

    it('TEACHING_ASSISTANT cannot delete materials', () => {
      expect(hasPermission('TEACHING_ASSISTANT', 'materials:delete')).toBe(false);
    });

    it('only ADMIN has materials:delete permission', () => {
      const roles = ['ADMIN', 'TEACHER', 'MANAGER', 'TEACHING_ASSISTANT'] as const;
      const hasPermissions = roles.map(role => hasPermission(role, 'materials:delete'));
      expect(hasPermissions).toEqual([true, false, false, false]);
    });
  });

  describe('materials:download', () => {
    it('ADMIN can download materials', () => {
      expect(hasPermission('ADMIN', 'materials:download')).toBe(true);
    });

    it('MANAGER can download materials', () => {
      expect(hasPermission('MANAGER', 'materials:download')).toBe(true);
    });

    it('TEACHER can download materials', () => {
      expect(hasPermission('TEACHER', 'materials:download')).toBe(true);
    });

    it('TEACHING_ASSISTANT can download materials', () => {
      expect(hasPermission('TEACHING_ASSISTANT', 'materials:download')).toBe(true);
    });

    it('all roles can download materials', () => {
      const roles = ['ADMIN', 'TEACHER', 'MANAGER', 'TEACHING_ASSISTANT'] as const;
      const hasPermissions = roles.map(role => hasPermission(role, 'materials:download'));
      expect(hasPermissions).toEqual([true, true, true, true]);
    });

    it('materials:download is more permissive than materials:upload', () => {
      const roles = ['ADMIN', 'TEACHER', 'MANAGER', 'TEACHING_ASSISTANT'] as const;
      roles.forEach(role => {
        const canDownload = hasPermission(role, 'materials:download');
        const canUpload = hasPermission(role, 'materials:upload');
        // Download should always be true or equal to upload
        if (canUpload) {
          expect(canDownload).toBe(true);
        }
      });
    });
  });

  describe('Material permissions consistency', () => {
    it('ADMIN has all material permissions', () => {
      expect(hasPermission('ADMIN', 'materials:upload')).toBe(true);
      expect(hasPermission('ADMIN', 'materials:delete')).toBe(true);
      expect(hasPermission('ADMIN', 'materials:download')).toBe(true);
    });

    it('MANAGER can only download (not upload or delete)', () => {
      expect(hasPermission('MANAGER', 'materials:upload')).toBe(false);
      expect(hasPermission('MANAGER', 'materials:delete')).toBe(false);
      expect(hasPermission('MANAGER', 'materials:download')).toBe(true);
    });

    it('TEACHER can only download (not upload or delete)', () => {
      expect(hasPermission('TEACHER', 'materials:upload')).toBe(false);
      expect(hasPermission('TEACHER', 'materials:delete')).toBe(false);
      expect(hasPermission('TEACHER', 'materials:download')).toBe(true);
    });

    it('TEACHING_ASSISTANT can only download (not upload or delete)', () => {
      expect(hasPermission('TEACHING_ASSISTANT', 'materials:upload')).toBe(false);
      expect(hasPermission('TEACHING_ASSISTANT', 'materials:delete')).toBe(false);
      expect(hasPermission('TEACHING_ASSISTANT', 'materials:download')).toBe(true);
    });

    it('non-ADMIN roles cannot upload or delete', () => {
      const nonAdminRoles = ['TEACHER', 'MANAGER', 'TEACHING_ASSISTANT'] as const;
      nonAdminRoles.forEach(role => {
        expect(hasPermission(role, 'materials:upload')).toBe(false);
        expect(hasPermission(role, 'materials:delete')).toBe(false);
      });
    });

    it('all roles can download', () => {
      const allRoles = ['ADMIN', 'TEACHER', 'MANAGER', 'TEACHING_ASSISTANT'] as const;
      allRoles.forEach(role => {
        expect(hasPermission(role, 'materials:download')).toBe(true);
      });
    });
  });

  describe('Material permissions separation of concerns', () => {
    it('upload and delete permissions are separated', () => {
      // A role could theoretically have upload without delete or vice versa
      // Currently both are admin-only, but they should be separate permissions
      expect(hasPermission('ADMIN', 'materials:upload')).toBe(true);
      expect(hasPermission('ADMIN', 'materials:delete')).toBe(true);
    });

    it('download permission is independent from upload/delete', () => {
      // Download should be available even to roles that cannot upload or delete
      const restrictedRoles = ['TEACHER', 'MANAGER', 'TEACHING_ASSISTANT'] as const;
      restrictedRoles.forEach(role => {
        const canDownload = hasPermission(role, 'materials:download');
        const canUpload = hasPermission(role, 'materials:upload');
        const canDelete = hasPermission(role, 'materials:delete');

        expect(canDownload).toBe(true);
        expect(canUpload).toBe(false);
        expect(canDelete).toBe(false);
      });
    });
  });
});
