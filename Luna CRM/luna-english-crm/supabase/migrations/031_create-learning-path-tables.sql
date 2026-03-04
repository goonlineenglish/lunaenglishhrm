-- ============================================================================
-- Migration 031: Learning path and milestone tracking tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.learning_paths (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL UNIQUE REFERENCES public.students (id) ON DELETE CASCADE,
  program_type public.program_type NOT NULL,
  current_level TEXT,
  total_levels INTEGER,
  sessions_per_level INTEGER,
  current_session INTEGER NOT NULL DEFAULT 0,
  started_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT learning_paths_total_levels_positive_check
    CHECK (total_levels IS NULL OR total_levels > 0),
  CONSTRAINT learning_paths_sessions_per_level_positive_check
    CHECK (sessions_per_level IS NULL OR sessions_per_level > 0),
  CONSTRAINT learning_paths_current_session_non_negative_check
    CHECK (current_session >= 0)
);

CREATE TABLE IF NOT EXISTS public.learning_milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  learning_path_id UUID NOT NULL REFERENCES public.learning_paths (id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL,
  milestone_name TEXT NOT NULL,
  achieved_at DATE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_paths_student_id
  ON public.learning_paths (student_id);
CREATE INDEX IF NOT EXISTS idx_learning_paths_program_type
  ON public.learning_paths (program_type);
CREATE INDEX IF NOT EXISTS idx_learning_milestones_path_achieved_at
  ON public.learning_milestones (learning_path_id, achieved_at DESC);

DROP TRIGGER IF EXISTS on_learning_paths_updated ON public.learning_paths;
CREATE TRIGGER on_learning_paths_updated
  BEFORE UPDATE ON public.learning_paths
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_learning_milestones_updated ON public.learning_milestones;
CREATE TRIGGER on_learning_milestones_updated
  BEFORE UPDATE ON public.learning_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
