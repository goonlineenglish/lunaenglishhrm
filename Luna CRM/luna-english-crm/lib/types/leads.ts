export type LeadSource =
  | "facebook"
  | "zalo"
  | "walk_in"
  | "website"
  | "phone"
  | "referral";

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
  | "primary_success"
  | "secondary"
  | "ielts";

export type LeadActivityType =
  | "call"
  | "message"
  | "meeting"
  | "note"
  | "stage_change"
  | "trial_booked";

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

export interface LeadActivity {
  id: string;
  lead_id: string;
  type: LeadActivityType;
  content: string | null;
  created_by: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
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
