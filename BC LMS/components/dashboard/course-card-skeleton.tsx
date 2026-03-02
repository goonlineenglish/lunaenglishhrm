// CourseCardSkeleton — placeholder while course cards are loading
// Matches the layout of CourseCard exactly

import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { SkeletonBlock, SkeletonText } from '@/components/shared/skeleton';

export function CourseCardSkeleton() {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <SkeletonText className="w-3/4 h-5" />
          <SkeletonBlock className="w-14 h-5" />
        </div>
        <SkeletonText className="w-1/2 h-3 mt-1" />
      </CardHeader>

      <CardContent className="flex flex-col flex-1 gap-3 pt-0">
        <SkeletonText className="w-full h-4" />
        <SkeletonText className="w-2/3 h-4" />

        <div className="flex items-center gap-1.5 mt-auto">
          <SkeletonBlock className="w-4 h-4 rounded-full" />
          <SkeletonText className="w-20 h-3" />
        </div>

        <SkeletonBlock className="w-full h-1.5 rounded-full" />
        <SkeletonBlock className="w-full h-8 rounded-md" />
      </CardContent>
    </Card>
  );
}
