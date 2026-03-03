// Admin user detail page — view user info, manage program assignments
// Server component fetching user details + available programs

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { RoleBadge } from '@/components/shared/role-badge';
import type { Role } from '@/lib/types/user';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [user] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        school: true,
        role: true,
        isDeleted: true,
        createdAt: true,
        programs: {
          select: {
            program: { select: { id: true, name: true, slug: true, isDeleted: true } },
          },
        },
        enrollments: {
          select: {
            id: true,
            course: { select: { id: true, title: true } },
          },
        },
        _count: { select: { programs: true, enrollments: true } },
      },
    }),
  ]);

  if (!user) notFound();

  return (
    <div className="p-6 max-w-3xl">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
      </Link>

      <div className="bg-white rounded-lg border p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-neutral-900">{user.name}</h1>
            <p className="text-sm text-neutral-500 mt-1">{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <RoleBadge role={user.role as Role} />
            {user.isDeleted && (
              <span className="text-xs text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                Đã xóa
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-neutral-500">Trường/Cơ sở</p>
            <p className="font-medium">{user.school ?? '—'}</p>
          </div>
          <div>
            <p className="text-neutral-500">Ngày tạo</p>
            <p className="font-medium">
              {new Date(user.createdAt).toLocaleDateString('vi-VN')}
            </p>
          </div>
          <div>
            <p className="text-neutral-500">Chương trình</p>
            <p className="font-medium">{user._count.programs}</p>
          </div>
          <div>
            <p className="text-neutral-500">Khóa học</p>
            <p className="font-medium">{user._count.enrollments}</p>
          </div>
        </div>
      </div>

      {/* Assigned programs */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-base font-semibold mb-4">Chương trình được gán</h2>
        {user.programs.length === 0 ? (
          <p className="text-sm text-neutral-500">Chưa gán chương trình nào</p>
        ) : (
          <ul className="space-y-2">
            {user.programs.map(({ program }) => (
              <li key={program.id} className="flex items-center justify-between text-sm">
                <span>{program.name}</span>
                <span className="text-xs text-neutral-400">{program.slug}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
