/**
 * Student Hub constants — Vietnamese labels for payment, attendance, programs, gender
 */
import type { ProgramType } from "@/lib/types/leads";
import type { AttendanceStatus, PaymentStatus } from "@/lib/types/student-hub-types";

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: "Đã thanh toán",
  partial: "Thanh toán một phần",
  unpaid: "Chưa thanh toán",
  overdue: "Quá hạn",
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  paid: "bg-green-100 text-green-800",
  partial: "bg-yellow-100 text-yellow-800",
  unpaid: "bg-red-100 text-red-800",
  overdue: "bg-red-200 text-red-900 font-bold",
};

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "Có mặt",
  absent: "Vắng",
  late: "Đi muộn",
  excused: "Có phép",
};

export const GENDER_LABELS: Record<string, string> = {
  male: "Nam",
  female: "Nữ",
  other: "Khác",
};

/** Program config: label, total levels, sessions per level */
export const PROGRAM_CONFIGS: Record<ProgramType, { label: string; totalLevels: number; sessionsPerLevel: number }> = {
  buttercup: { label: "Buttercup (4-7 tuổi)", totalLevels: 15, sessionsPerLevel: 35 },
  primary_basic: { label: "TH Cơ bản (BGD)", totalLevels: 3, sessionsPerLevel: 70 },
  primary_success: { label: "Primary Success", totalLevels: 2, sessionsPerLevel: 125 },
  secondary: { label: "THCS (Deprecated)", totalLevels: 4, sessionsPerLevel: 70 },
  secondary_basic: { label: "THCS Cơ bản", totalLevels: 4, sessionsPerLevel: 70 },
  secondary_advanced: { label: "THCS Nâng cao (Prepare)", totalLevels: 4, sessionsPerLevel: 70 },
  ielts: { label: "IELTS", totalLevels: 1, sessionsPerLevel: 120 },
};

export const PROGRAM_TYPE_OPTIONS: { value: ProgramType; label: string }[] = [
  { value: "buttercup", label: "Buttercup" },
  { value: "primary_basic", label: "TH Cơ bản (BGD)" },
  { value: "primary_success", label: "Primary Success" },
  { value: "secondary_basic", label: "THCS Cơ bản" },
  { value: "secondary_advanced", label: "THCS Nâng cao" },
  { value: "ielts", label: "IELTS" },
];
