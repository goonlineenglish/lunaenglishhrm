import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getReminders } from "@/lib/actions/reminder-actions";
import { ReminderDashboard } from "@/components/reminders/reminder-dashboard";

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

  const { data: reminders } = await getReminders();

  return <ReminderDashboard reminders={reminders} />;
}
