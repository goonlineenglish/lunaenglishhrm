"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ReminderType, ReminderStatus } from "@/lib/types/leads";

export async function createReminder(
  leadId: string,
  remindAt: string,
  type: ReminderType,
  note?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Chua dang nhap" };

  const { error } = await supabase.from("follow_up_reminders").insert({
    lead_id: leadId,
    remind_at: remindAt,
    type,
    note: note || null,
    assigned_to: user.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/reminders");
  return { success: true };
}

export async function completeReminder(id: string, note?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Chua dang nhap" };

  const { data: reminder, error: fetchError } = await supabase
    .from("follow_up_reminders")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !reminder) return { error: "Khong tim thay nhac nho" };

  const { error } = await supabase
    .from("follow_up_reminders")
    .update({
      status: "done" as ReminderStatus,
      note: note || reminder.note,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  // If nurture type (follow_up on nurturing lead), auto-create next 7-day reminder
  if (reminder.type === "follow_up") {
    const nextRemindAt = new Date();
    nextRemindAt.setDate(nextRemindAt.getDate() + 7);

    await supabase.from("follow_up_reminders").insert({
      lead_id: reminder.lead_id,
      remind_at: nextRemindAt.toISOString(),
      type: "follow_up" as ReminderType,
      assigned_to: reminder.assigned_to,
      note: "Tu dong tao - follow-up tiep theo",
    });
  }

  revalidatePath("/reminders");
  return { success: true };
}

export async function skipReminder(id: string, reason?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Chua dang nhap" };

  const { error } = await supabase
    .from("follow_up_reminders")
    .update({
      status: "skipped" as ReminderStatus,
      note: reason || null,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/reminders");
  return { success: true };
}

export interface ReminderFilter {
  status?: ReminderStatus;
  type?: ReminderType;
}

export interface ReminderWithLead {
  id: string;
  lead_id: string;
  remind_at: string;
  type: ReminderType;
  status: ReminderStatus;
  assigned_to: string | null;
  note: string | null;
  created_at: string;
  leads: {
    id: string;
    parent_name: string;
    student_name: string | null;
    parent_phone: string;
  };
}

export async function getReminders(
  userId?: string,
  filter?: ReminderFilter
): Promise<{ data: ReminderWithLead[]; error?: string }> {
  const supabase = await createClient();

  let query = supabase
    .from("follow_up_reminders")
    .select(
      "id, lead_id, remind_at, type, status, assigned_to, note, created_at, leads(id, parent_name, student_name, parent_phone)"
    )
    .order("remind_at", { ascending: true });

  if (userId) {
    query = query.eq("assigned_to", userId);
  }

  if (filter?.status) {
    query = query.eq("status", filter.status);
  } else {
    query = query.eq("status", "pending");
  }

  if (filter?.type) {
    query = query.eq("type", filter.type);
  }

  const { data, error } = await query;

  if (error) return { data: [], error: error.message };

  return { data: (data as unknown as ReminderWithLead[]) ?? [] };
}

export async function searchLeads(searchTerm: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leads")
    .select("id, parent_name, student_name, parent_phone")
    .or(
      `parent_name.ilike.%${searchTerm}%,student_name.ilike.%${searchTerm}%,parent_phone.ilike.%${searchTerm}%`
    )
    .limit(10);

  if (error) return { data: [], error: error.message };

  return { data: data ?? [] };
}
