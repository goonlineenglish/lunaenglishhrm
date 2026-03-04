export type LeadSource =
  | "facebook"
  | "zalo"
  | "walk_in"
  | "website"
  | "phone"
  | "referral"
  | "google_sheet";

export type LeadStage =
  | "moi_tiep_nhan"
  | "da_tu_van"
  | "dang_nurture"
  | "dat_lich_hoc_thu"
  | "dang_hoc_thu"
  | "cho_chot"
  | "da_dang_ky"
  | "mat_lead";

export type ProgramType =
  | "buttercup"
  | "primary_basic"
  | "primary_success"
  | "secondary"
  | "secondary_basic"
  | "secondary_advanced"
  | "ielts";

export type LeadActivityType =
  | "call"
  | "message"
  | "meeting"
  | "note"
  | "stage_change"
  | "trial_booked"
  | "scheduled_call"
  | "trial_class"
  | "consultation"
  | "checklist";

export type ReminderType =
  | "follow_up"
  | "trial_reminder"
  | "close_reminder"
  | "renewal";

export type ReminderStatus = "pending" | "done" | "skipped";

export interface Lead {
  id: string;
  student_name: string | null;
  student_dob: string | null;
  parent_name: string;
  parent_phone: string;
  parent_email: string | null;
  parent_address: string | null;
  source: LeadSource;
  referral_code: string | null;
  program_interest: ProgramType | null;
  current_stage: LeadStage;
  assigned_to: string | null;
  expected_class: string | null;
  notes: string | null;
  lost_reason: string | null;
  created_at: string;
  updated_at: string;
}

export type ActivityStatus = "pending" | "completed" | "cancelled";
export type RecurrencePattern = "once" | "weekly";

export interface LeadActivity {
  id: string;
  lead_id: string;
  type: LeadActivityType;
  content: string | null;
  created_by: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  title: string | null;
  schedule_from: string | null;
  schedule_to: string | null;
  location: string | null;
  participant_ids: string[];
  status: ActivityStatus;
  recurrence_pattern: RecurrencePattern;
  recurrence_day_of_week: number | null;
  parent_activity_id: string | null;
}

export interface StageNote {
  id: string;
  lead_id: string;
  stage: LeadStage;
  note: string | null;
  result: string | null;
  next_steps: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface StageNextStepConfig {
  id: string;
  stage: LeadStage;
  steps: StageNextStep[];
  updated_by: string | null;
  updated_at: string;
}

export interface StageNextStep {
  id: string;
  label: string;
  order: number;
}

export interface FollowUpReminder {
  id: string;
  lead_id: string;
  remind_at: string;
  type: ReminderType;
  status: ReminderStatus;
  assigned_to: string | null;
  note: string | null;
  created_at: string;
}
