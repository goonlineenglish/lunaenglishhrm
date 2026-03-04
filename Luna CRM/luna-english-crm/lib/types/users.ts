import type { ProgramType } from "@/lib/types/leads";

export type UserRole = "admin" | "advisor" | "marketing";

export type StudentStatus = "active" | "paused" | "graduated" | "dropped";

export type RenewalStatus = "pending" | "renewed" | "lost";

export type StudentGender = "male" | "female" | "other";

export type PaymentStatus = "paid" | "partial" | "unpaid" | "overdue";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  lead_id: string | null;
  student_code: string | null;
  date_of_birth: string | null;
  gender: StudentGender | null;
  address: string | null;
  teacher_name: string | null;
  current_class: string | null;
  current_level: string | null;
  enrollment_date: string | null;
  level_end_date: string | null;
  tuition_amount: number | null;
  payment_status: PaymentStatus | null;
  program_type: ProgramType | null;
  sheet_row_index: number | null;
  status: StudentStatus;
  renewal_status: RenewalStatus;
  created_at: string;
  updated_at: string;
}
