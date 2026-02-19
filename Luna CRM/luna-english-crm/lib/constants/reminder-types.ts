import type { ReminderType } from "@/lib/types/leads";

export const REMINDER_TYPES: Record<
  ReminderType,
  { label: string; icon: string }
> = {
  follow_up: { label: "Follow-up", icon: "PhoneCall" },
  trial_reminder: { label: "Nhac hoc thu", icon: "GraduationCap" },
  close_reminder: { label: "Nhac chot", icon: "Target" },
  renewal: { label: "Gia han", icon: "RefreshCw" },
};
