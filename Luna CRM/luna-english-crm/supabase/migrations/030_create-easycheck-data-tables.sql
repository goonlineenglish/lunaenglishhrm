-- ============================================================================
-- Migration 030: EasyCheck-derived student data tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  class_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'present',
  note TEXT,
  source TEXT NOT NULL DEFAULT 'easycheck',
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT attendance_records_status_check
    CHECK (status IN ('present', 'absent', 'late', 'excused'))
);

CREATE TABLE IF NOT EXISTS public.teacher_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  class_date DATE NOT NULL,
  comment TEXT NOT NULL,
  teacher_name TEXT,
  source TEXT NOT NULL DEFAULT 'easycheck',
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.student_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  score NUMERIC(5, 2) NOT NULL,
  max_score NUMERIC(5, 2) NOT NULL DEFAULT 10,
  test_date DATE NOT NULL,
  source TEXT NOT NULL DEFAULT 'easycheck',
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT student_scores_max_score_positive_check CHECK (max_score > 0),
  CONSTRAINT student_scores_score_non_negative_check CHECK (score >= 0)
);

CREATE TABLE IF NOT EXISTS public.homework_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  homework_name TEXT NOT NULL,
  submitted BOOLEAN NOT NULL DEFAULT false,
  due_date DATE,
  submitted_at DATE,
  source TEXT NOT NULL DEFAULT 'easycheck',
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.student_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'easycheck',
  internal_only BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_records_student_date
  ON public.attendance_records (student_id, class_date DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_comments_student_date
  ON public.teacher_comments (student_id, class_date DESC);
CREATE INDEX IF NOT EXISTS idx_student_scores_student_date
  ON public.student_scores (student_id, test_date DESC);
CREATE INDEX IF NOT EXISTS idx_homework_records_student_due_date
  ON public.homework_records (student_id, due_date DESC);
CREATE INDEX IF NOT EXISTS idx_student_notes_student_created
  ON public.student_notes (student_id, created_at DESC);

DROP TRIGGER IF EXISTS on_attendance_records_updated ON public.attendance_records;
CREATE TRIGGER on_attendance_records_updated
  BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_teacher_comments_updated ON public.teacher_comments;
CREATE TRIGGER on_teacher_comments_updated
  BEFORE UPDATE ON public.teacher_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_student_scores_updated ON public.student_scores;
CREATE TRIGGER on_student_scores_updated
  BEFORE UPDATE ON public.student_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_homework_records_updated ON public.homework_records;
CREATE TRIGGER on_homework_records_updated
  BEFORE UPDATE ON public.homework_records
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_student_notes_updated ON public.student_notes;
CREATE TRIGGER on_student_notes_updated
  BEFORE UPDATE ON public.student_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
