import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getReminders } from "@/lib/actions/reminder-actions";
import { ReminderDashboard } from "@/components/reminders/reminder-dashboard";
import type { UserRole } from "@/lib/types/users";

export const metadata: Metadata = {
  title: "Nhắc nhở | Luna English CRM",
  description: "Quản lý nhắc nhở follow-up và lịch hẹn tư vấn",
};

export default async function RemindersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = (profile?.role as UserRole) ?? "advisor";

  // Admin sees all reminders, advisors see only their own
  const userId = role === "admin" ? undefined : user.id;
  const { data: reminders } = await getReminders(userId);

  return <ReminderDashboard reminders={reminders} />;
}
