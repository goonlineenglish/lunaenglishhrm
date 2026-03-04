/**
 * Student Hub types — EasyCheck data, learning paths, sync infrastructure
 * Used by Phase 2 (types), Phase 4 (sync), Phase 5 (UI)
 */
import type { ProgramType } from "@/lib/types/leads";

export type AttendanceStatus = "present" | "absent" | "late" | "excused";
export type PaymentStatus = "paid" | "partial" | "unpaid" | "overdue";
export type SyncRunStatus = "running" | "completed" | "error" | "timeout";

export interface AttendanceRecord {
  id: string;
  student_id: string;
  class_date: string;
  status: AttendanceStatus;
  note: string | null;
  source: string;
  synced_at: string;
}

export interface TeacherComment {
  id: string;
  student_id: string;
  class_date: string;
  comment: string;
  teacher_name: string | null;
  source: string;
  synced_at: string;
}

export interface StudentScore {
  id: string;
  student_id: string;
  test_name: string;
  score: number;
  max_score: number;
  test_date: string;
  source: string;
  synced_at: string;
}

export interface HomeworkRecord {
  id: string;
  student_id: string;
  homework_name: string;
  submitted: boolean;
  due_date: string | null;
  submitted_at: string | null;
  source: string;
  synced_at: string;
}

export interface StudentNote {
  id: string;
  student_id: string;
  note: string;
  source: string;
  internal_only: boolean;
  created_at: string;
}

export interface LearningPath {
  id: string;
  student_id: string;
  program_type: ProgramType;
  current_level: string | null;
  total_levels: number;
  sessions_per_level: number;
  current_session: number;
  started_at: string | null;
  updated_at: string;
}

export interface LearningMilestone {
  id: string;
  learning_path_id: string;
  milestone_type: string;
  milestone_name: string;
  achieved_at: string | null;
  created_at: string;
}

export interface SheetSyncSnapshot {
  id: string;
  snapshot_data: Record<string, unknown>[];
  row_count: number;
  synced_at: string;
}

export interface SyncRun {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: SyncRunStatus;
  error: string | null;
  created_at: string;
}
