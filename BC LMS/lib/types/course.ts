// Course and Lesson type definitions
// CourseLevel: BASIC (all roles), ADVANCED (ADMIN + TEACHER only)

export type CourseLevel = 'BASIC' | 'ADVANCED';
export type CourseType = 'TRAINING' | 'MATERIAL';

export type CourseListItem = {
  id: string;
  title: string;
  description: string | null;
  type: CourseType;
  level: CourseLevel;
  order: number;
  isDeleted: boolean;
  programId: string;
  program: { name: string; slug: string };
  _count: { lessons: number; enrollments: number };
  /** Active lesson IDs — used by dashboard to compute per-course completion ratio */
  lessonIds?: string[];
};

export type CourseDetail = CourseListItem & {
  lessons: LessonItem[];
};

export type LessonItem = {
  id: string;
  title: string;
  content: string | null;
  videoUrl: string | null;
  order: number;
  duration: number | null;
  isDeleted: boolean;
  courseId: string;
};

export type CreateCourseInput = {
  programId: string;
  title: string;
  description?: string;
  type: CourseType;
  level: CourseLevel;
  order: number;
};

export type UpdateCourseInput = Partial<CreateCourseInput>;

export type CreateLessonInput = {
  courseId: string;
  title: string;
  order: number;
  duration?: number;
  content?: string;
  videoUrl?: string;
};

export type UpdateLessonInput = Partial<Omit<CreateLessonInput, 'courseId'>>;

export type CourseActionResult<T = CourseListItem> =
  | { success: true; data: T }
  | { success: false; error: string };
