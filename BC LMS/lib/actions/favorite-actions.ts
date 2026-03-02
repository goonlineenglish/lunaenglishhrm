// Favorite server actions — toggle and list favorites
// Uses composite PK [userId, courseId]; toggle = check + delete or create

'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth/auth-guard';

export interface FavoriteItem {
  courseId: string;
  course: {
    id: string;
    title: string;
    description: string | null;
    program: { name: string };
  };
  createdAt: Date;
}

/** Toggle favorite status for a course. Returns the new isFavorited state. */
export async function toggleFavorite(
  courseId: string
): Promise<{ success: boolean; isFavorited: boolean; error?: string }> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, isFavorited: false, error: 'Chưa đăng nhập' };

    const existing = await prisma.favorite.findUnique({
      where: { userId_courseId: { userId: user.sub, courseId } },
    });

    if (existing) {
      await prisma.favorite.delete({
        where: { userId_courseId: { userId: user.sub, courseId } },
      });
      revalidatePath('/dashboard');
      return { success: true, isFavorited: false };
    } else {
      await prisma.favorite.create({
        data: { userId: user.sub, courseId },
      });
      revalidatePath('/dashboard');
      return { success: true, isFavorited: true };
    }
  } catch (error) {
    console.error('toggleFavorite error:', error);
    return { success: false, isFavorited: false, error: 'Không thể cập nhật yêu thích' };
  }
}

/** Get all favorites for a user */
export async function getUserFavorites(userId: string): Promise<FavoriteItem[]> {
  const favorites = await prisma.favorite.findMany({
    where: { userId },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          description: true,
          program: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return favorites as FavoriteItem[];
}

/** Check if a course is favorited by current user */
export async function isCourseBookmarked(
  userId: string,
  courseId: string
): Promise<boolean> {
  const fav = await prisma.favorite.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  return !!fav;
}
