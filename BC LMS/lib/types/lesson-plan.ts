// Lesson plan type definitions — list item, create/update inputs, filter params

export type LessonPlanItem = {
  id: string;
  title: string;
  programId: string;
  programName: string;
  programSlug: string;
  userId: string;
  content: string; // Tiptap JSON as string
  createdAt: Date;
  updatedAt: Date;
};

export type CreateLessonPlanInput = {
  title: string;
  programId: string;
  content: string; // JSON.stringify(editor.getJSON())
};

export type UpdateLessonPlanInput = {
  title?: string;
  content?: string;
};

export type LessonPlanFilterParams = {
  search?: string;
  programId?: string;
};
