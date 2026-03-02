// Admin course detail page — server component
// Shows course info, edit form, and inline lesson management
// Soft delete / restore course actions handled via client components

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getCourseById } from '@/lib/actions/course-actions';
import { getPrograms } from '@/lib/actions/program-actions';
import { LessonList } from '@/components/admin/lesson-list';
import { CourseEditPanel } from '@/components/admin/course-edit-panel';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const course = await getCourseById(id);
  return { title: course ? `${course.title} | BC LMS` : 'Khóa học | BC LMS' };
}

function LevelBadge({ level }: { level: 'BASIC' | 'ADVANCED' }) {
  return (
    <Badge
      className={level === 'ADVANCED'
        ? 'bg-purple-100 text-purple-800'
        : 'bg-gray-100 text-gray-700'}
    >
      {level === 'ADVANCED' ? 'Nâng cao' : 'Cơ bản'}
    </Badge>
  );
}

function TypeBadge({ type }: { type: 'TRAINING' | 'MATERIAL' }) {
  return (
    <Badge variant="outline" className={type === 'TRAINING' ? 'border-blue-400 text-blue-700' : 'border-amber-400 text-amber-700'}>
      {type === 'TRAINING' ? 'Đào tạo' : 'Tài liệu'}
    </Badge>
  );
}

export default async function AdminCourseDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [course, allPrograms] = await Promise.all([
    getCourseById(id),
    getPrograms({ showDeleted: false }),
  ]);

  if (!course) notFound();

  const programs = allPrograms.map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Back link */}
      <Link
        href="/admin/courses"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh sách khóa học
      </Link>

      {/* Course header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
          <p className="text-gray-500 text-sm mt-1">{course.program.name}</p>
          <div className="flex gap-2 mt-2">
            <TypeBadge type={course.type} />
            <LevelBadge level={course.level} />
            {course.isDeleted && (
              <Badge variant="destructive">Đã xóa</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Edit form panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Thông tin khóa học</CardTitle>
          </CardHeader>
          <CardContent>
            <CourseEditPanel course={course} programs={programs} />
          </CardContent>
        </Card>

        {/* Lesson management */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quản lý bài học</CardTitle>
          </CardHeader>
          <CardContent>
            <LessonList courseId={course.id} initialLessons={course.lessons} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
