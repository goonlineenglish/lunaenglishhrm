"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ReminderType, ReminderStatus } from "@/lib/types/leads";
import { ensureUserProfile } from "./ensure-user-profile";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function createReminder(
  leadId: string,
  remindAt: string,
  type: ReminderType,
  note?: string
) {
  if (!UUID_REGEX.test(leadId)) return { error: "ID không hợp lệ" };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: "Chưa đăng nhập" };

    const profileResult = await ensureUserProfile(supabase, user);
    if ("error" in profileResult) {
      return { error: profileResult.error };
    }

    const { error } = await supabase.from("follow_up_reminders").insert({
      lead_id: leadId,
      remind_at: remindAt,
      type,
      note: note || null,
      assigned_to: user.id,
    });

    if (error) return { error: "Không thể tạo nhắc nhở" };

    revalidatePath("/reminders");
    return { success: true };
  } catch (err) {
    console.error("createReminder error:", err);
    return { error: "Đã xảy ra lỗi. Vui lòng thử lại." };
  }
}

export async function completeReminder(id: string, note?: string) {
  if (!UUID_REGEX.test(id)) return { error: "ID không hợp lệ" };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: "Chưa đăng nhập" };

    const profileResult = await ensureUserProfile(supabase, user);
    if ("error" in profileResult) {
      return { error: profileResult.error };
    }

    const { data: reminder, error: fetchError } = await supabase
      .from("follow_up_reminders")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !reminder) return { error: "Không tìm thấy nhắc nhở" };

    const { error } = await supabase
      .from("follow_up_reminders")
      .update({
        status: "done" as ReminderStatus,
        note: note || reminder.note,
      })
      .eq("id", id);

    if (error) return { error: "Không thể cập nhật nhắc nhở" };

    // If nurture type (follow_up on nurturing lead), auto-create next 7-day reminder
    if (reminder.type === "follow_up") {
      const nextRemindAt = new Date();
      nextRemindAt.setDate(nextRemindAt.getDate() + 7);

      await supabase.from("follow_up_reminders").insert({
        lead_id: reminder.lead_id,
        remind_at: nextRemindAt.toISOString(),
        type: "follow_up" as ReminderType,
        assigned_to: reminder.assigned_to,
        note: "Tự động tạo - follow-up tiếp theo",
      });
    }

    revalidatePath("/reminders");
    return { success: true };
  } catch (err) {
    console.error("completeReminder error:", err);
    return { error: "Đã xảy ra lỗi. Vui lòng thử lại." };
  }
}

export async function skipReminder(id: string, reason?: string) {
  if (!UUID_REGEX.test(id)) return { error: "ID không hợp lệ" };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: "Chưa đăng nhập" };

    const profileResult = await ensureUserProfile(supabase, user);
    if ("error" in profileResult) {
      return { error: profileResult.error };
    }

    const { error } = await supabase
      .from("follow_up_reminders")
      .update({
        status: "skipped" as ReminderStatus,
        note: reason || null,
      })
      .eq("id", id);

    if (error) return { error: "Không thể bỏ qua nhắc nhở" };

    revalidatePath("/reminders");
    return { success: true };
  } catch (err) {
    console.error("skipReminder error:", err);
    return { error: "Đã xảy ra lỗi. Vui lòng thử lại." };
  }
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
  filter?: ReminderFilter
): Promise<{ data: ReminderWithLead[]; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: [], error: "Chưa đăng nhập" };

    let query = supabase
      .from("follow_up_reminders")
      .select(
        "id, lead_id, remind_at, type, status, assigned_to, note, created_at, leads(id, parent_name, student_name, parent_phone)"
      )
      .eq("assigned_to", user.id)
      .order("remind_at", { ascending: true });

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
  } catch (err) {
    console.error("getReminders error:", err);
    return { data: [], error: "Đã xảy ra lỗi. Vui lòng thử lại." };
  }
}

export async function searchLeads(searchTerm: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: [], error: "Chưa đăng nhập" };

    // Escape special characters for Supabase ilike filter
    const escaped = searchTerm
      .replace(/\\/g, "\\\\")
      .replace(/%/g, "\\%")
      .replace(/_/g, "\\_");

    const { data, error } = await supabase
      .from("leads")
      .select("id, parent_name, student_name, parent_phone")
      .is("deleted_at", null)
      .or(
        `parent_name.ilike.%${escaped}%,student_name.ilike.%${escaped}%,parent_phone.ilike.%${escaped}%`
      )
      .limit(10);

    if (error) return { data: [], error: error.message };

    return { data: data ?? [] };
  } catch (err) {
    console.error("searchLeads error:", err);
    return { data: [], error: "Đã xảy ra lỗi. Vui lòng thử lại." };
  }
}
