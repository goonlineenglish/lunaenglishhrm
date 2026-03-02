// CourseCard — displays a single accessible course in the dashboard grid
// Shows title, program name, lesson count, type badge, level badge, and view link

import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { CourseLevel, CourseType } from '@/lib/types/course';

interface CourseCardProps {
  course: {
    id: string;
    title: string;
    description: string | null;
    level: CourseLevel;
    type: CourseType;
    program: { name: string };
    _count: { lessons: number };
  };
  showLevelBadge?: boolean;
}

const TYPE_BADGE: Record<CourseType, { label: string; className: string }> = {
  TRAINING: { label: 'Đào tạo', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  MATERIAL: { label: 'Tài liệu', className: 'bg-gray-100 text-gray-700 border-gray-200' },
};

const LEVEL_BADGE: Record<CourseLevel, { label: string; className: string }> = {
  BASIC: { label: 'Cơ bản', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  ADVANCED: { label: 'Nâng cao', className: 'bg-purple-100 text-purple-800 border-purple-200' },
};

export function CourseCard({ course, showLevelBadge = false }: CourseCardProps) {
  const typeBadge = TYPE_BADGE[course.type];
  const levelBadge = LEVEL_BADGE[course.level];

  return (
    <Card className="flex flex-col hover:border-indigo-300 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug line-clamp-2">{course.title}</CardTitle>
          <div className="flex gap-1 shrink-0">
            <Badge variant="outline" className={typeBadge.className}>
              {typeBadge.label}
            </Badge>
            {showLevelBadge && (
              <Badge variant="outline" className={levelBadge.className}>
                {levelBadge.label}
              </Badge>
            )}
          </div>
        </div>
        <p className="text-xs text-neutral-500 mt-1">{course.program.name}</p>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 gap-3 pt-0">
        {course.description && (
          <p className="text-sm text-neutral-600 line-clamp-2">{course.description}</p>
        )}

        <div className="flex items-center gap-1.5 text-sm text-neutral-500 mt-auto">
          <BookOpen className="h-3.5 w-3.5" />
          <span>{course._count.lessons} bài học</span>
        </div>

        {/* Placeholder progress bar for Phase 2 */}
        <div className="w-full bg-neutral-100 rounded-full h-1.5">
          <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: '0%' }} />
        </div>

        <Button asChild variant="outline" size="sm" className="w-full border-indigo-200 text-indigo-700 hover:bg-indigo-50">
          <Link href={`/courses/${course.id}`}>Xem khóa học</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
