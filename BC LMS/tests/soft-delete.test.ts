import { describe, it, expect, vi, beforeEach } from 'vitest';
import { softDeleteProgram, softDeleteCourse } from '@/lib/services/soft-delete-service';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    course: {
      count: vi.fn(),
      update: vi.fn(),
    },
    lesson: {
      count: vi.fn(),
    },
    program: {
      update: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';

describe('Soft Delete Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('softDeleteProgram', () => {
    it('should fail if program has active courses', async () => {
      // Mock: program has 2 active courses
      vi.mocked(prisma.course.count).mockResolvedValueOnce(2);

      const result = await softDeleteProgram('prog1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Không thể xóa chương trình');
      expect(result.error).toContain('2');
      expect(prisma.program.update).not.toHaveBeenCalled();
    });

    it('should succeed if program has no active courses', async () => {
      // Mock: program has 0 active courses
      vi.mocked(prisma.course.count).mockResolvedValueOnce(0);
      vi.mocked(prisma.program.update).mockResolvedValueOnce({
        id: 'prog1',
        name: 'Test Program',
        slug: 'test-program',
        isDeleted: true,
        createdAt: new Date(),
      } as any);

      const result = await softDeleteProgram('prog1');

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(prisma.program.update).toHaveBeenCalledWith({
        where: { id: 'prog1' },
        data: { isDeleted: true },
      });
    });

    it('should fail if program has exactly 1 active course', async () => {
      vi.mocked(prisma.course.count).mockResolvedValueOnce(1);

      const result = await softDeleteProgram('prog1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('1');
    });

    it('should handle database error gracefully', async () => {
      vi.mocked(prisma.course.count).mockRejectedValueOnce(new Error('DB Error'));

      const result = await softDeleteProgram('prog1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Xóa chương trình thất bại');
    });
  });

  describe('softDeleteCourse', () => {
    it('should fail if course has active lessons', async () => {
      // Mock: course has 3 active lessons
      vi.mocked(prisma.lesson.count).mockResolvedValueOnce(3);

      const result = await softDeleteCourse('course1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Không thể xóa khóa học');
      expect(result.error).toContain('3');
      expect(prisma.course.update).not.toHaveBeenCalled();
    });

    it('should succeed if course has no active lessons', async () => {
      // Mock: course has 0 active lessons
      vi.mocked(prisma.lesson.count).mockResolvedValueOnce(0);
      vi.mocked(prisma.course.update).mockResolvedValueOnce({
        id: 'course1',
        name: 'Test Course',
        level: 'BASIC',
        isDeleted: true,
        programId: 'prog1',
        order: 1,
        createdAt: new Date(),
      } as any);

      const result = await softDeleteCourse('course1');

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(prisma.course.update).toHaveBeenCalledWith({
        where: { id: 'course1' },
        data: { isDeleted: true },
      });
    });

    it('should fail if course has 1 active lesson', async () => {
      vi.mocked(prisma.lesson.count).mockResolvedValueOnce(1);

      const result = await softDeleteCourse('course1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('1');
    });

    it('should handle database error gracefully', async () => {
      vi.mocked(prisma.lesson.count).mockRejectedValueOnce(new Error('DB Error'));

      const result = await softDeleteCourse('course1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Xóa khóa học thất bại');
    });

    it('should distinguish between different course IDs', async () => {
      vi.mocked(prisma.lesson.count).mockResolvedValueOnce(0);
      vi.mocked(prisma.course.update).mockResolvedValueOnce({
        id: 'course1',
        name: 'Course 1',
        level: 'BASIC',
        isDeleted: true,
        programId: 'prog1',
        order: 1,
        createdAt: new Date(),
      } as any);

      await softDeleteCourse('course1');

      expect(prisma.course.update).toHaveBeenCalledWith({
        where: { id: 'course1' },
        data: { isDeleted: true },
      });

      vi.clearAllMocks();
      vi.mocked(prisma.lesson.count).mockResolvedValueOnce(0);
      vi.mocked(prisma.course.update).mockResolvedValueOnce({
        id: 'course2',
        name: 'Course 2',
        level: 'BASIC',
        isDeleted: true,
        programId: 'prog1',
        order: 2,
        createdAt: new Date(),
      } as any);

      await softDeleteCourse('course2');

      expect(prisma.course.update).toHaveBeenCalledWith({
        where: { id: 'course2' },
        data: { isDeleted: true },
      });
    });
  });
});
