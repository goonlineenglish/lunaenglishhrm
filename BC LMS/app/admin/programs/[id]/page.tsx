// Admin program detail/edit page — server component
// Shows edit form and read-only list of courses in this program

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProgramEditForm } from '@/components/admin/program-edit-form';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const program = await prisma.program.findUnique({ where: { id } });
  return { title: program ? `${program.name} | BC LMS` : 'Chương trình | BC LMS' };
}

export default async function AdminProgramDetailPage({ params }: Props) {
  const { id } = await params;

  const program = await prisma.program.findUnique({
    where: { id },
    include: {
      _count: { select: { courses: true, users: true } },
      courses: {
        where: { isDeleted: false },
        orderBy: { order: 'asc' },
        select: { id: true, title: true, type: true, level: true, order: true },
      },
    },
  });

  if (!program) notFound();

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Back navigation */}
      <div>
        <Link href="/admin/programs">
          <Button variant="ghost" size="sm" className="text-gray-600 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Quay lại danh sách
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{program.name}</h1>
        <div className="flex gap-2 mt-2">
          <Badge variant="secondary" className="font-mono text-xs">{program.slug}</Badge>
          <Badge className="bg-indigo-100 text-indigo-800">
            {program._count.courses} khóa học
          </Badge>
          <Badge className="bg-gray-100 text-gray-800">
            {program._count.users} người dùng
          </Badge>
        </div>
      </div>

      {/* Edit form */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Chỉnh sửa thông tin</h2>
        <ProgramEditForm
          programId={id}
          defaultValues={{
            name: program.name,
            slug: program.slug,
            description: program.description ?? '',
          }}
        />
      </div>

      {/* Course list (read-only) */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">
          Khóa học ({program.courses.length})
        </h2>
        {program.courses.length === 0 ? (
          <p className="text-gray-500 text-sm">Chưa có khóa học nào trong chương trình này.</p>
        ) : (
          <ul className="divide-y">
            {program.courses.map((course) => (
              <li key={course.id} className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-medium text-sm">{course.order}. {course.title}</span>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">{course.type}</Badge>
                  <Badge
                    className={
                      course.level === 'ADVANCED'
                        ? 'bg-purple-100 text-purple-800 text-xs'
                        : 'bg-gray-100 text-gray-800 text-xs'
                    }
                  >
                    {course.level === 'ADVANCED' ? 'Nâng cao' : 'Cơ bản'}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
