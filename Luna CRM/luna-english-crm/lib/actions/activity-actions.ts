"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { LeadActivity, LeadActivityType } from "@/lib/types/leads";
import { ensureUserProfile } from "./ensure-user-profile";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

export async function createActivity(
  leadId: string,
  type: LeadActivityType,
  content: string
) {
  if (!isValidUUID(leadId)) {
    return { error: "ID không hợp lệ" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Chưa đăng nhập" };
  }

  const profileResult = await ensureUserProfile(supabase, user);
  if ("error" in profileResult) {
    return { error: profileResult.error };
  }

  const { data, error } = await supabase
    .from("lead_activities")
    .insert({
      lead_id: leadId,
      type,
      content: content.trim(),
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return { error: "Không thể tạo hoạt động" };
  }

  revalidatePath("/pipeline");
  return { data: data as LeadActivity };
}

export async function getActivities(leadId: string) {
  if (!isValidUUID(leadId)) {
    return { error: "ID không hợp lệ" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Chưa đăng nhập" };
  }

  const { data, error } = await supabase
    .from("lead_activities")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) {
    return { error: "Không thể tải hoạt động" };
  }

  return { data: data as LeadActivity[] };
}

// --- Checklist actions for Stage Next-Steps ---

export async function getStageChecklist(leadId: string, stage: string) {
  if (!isValidUUID(leadId)) {
    return { error: "ID không hợp lệ" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Chưa đăng nhập" };
  }

  const { data, error } = await supabase
    .from("lead_activities")
    .select("*")
    .eq("lead_id", leadId)
    .eq("type", "checklist")
    .filter("metadata->>stage", "eq", stage)
    .order("created_at", { ascending: true });

  if (error) {
    return { error: "Không thể tải checklist" };
  }

  return { data: data as LeadActivity[] };
}

export async function toggleChecklistItem(
  activityId: string,
  completed: boolean
) {
  if (!isValidUUID(activityId)) {
    return { error: "ID không hợp lệ" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Chưa đăng nhập" };
  }

  // Fetch activity to verify ownership via lead
  const { data: activity, error: fetchErr } = await supabase
    .from("lead_activities")
    .select("id, lead_id, metadata")
    .eq("id", activityId)
    .single();

  if (fetchErr || !activity) {
    return { error: "Không tìm thấy hoạt động" };
  }

  // Verify advisor is assigned to this lead
  const { data: lead } = await supabase
    .from("leads")
    .select("assigned_to")
    .eq("id", activity.lead_id)
    .single();

  if (!lead || lead.assigned_to !== user.id) {
    // Allow admins too — check user role
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return { error: "Không có quyền" };
    }
  }

  const meta = (activity.metadata ?? {}) as Record<string, unknown>;
  const updatedMeta = { ...meta, completed };

  const { error: updateErr } = await supabase
    .from("lead_activities")
    .update({
      metadata: updatedMeta,
      status: completed ? "completed" : "pending",
    })
    .eq("id", activityId);

  if (updateErr) {
    return { error: "Không thể cập nhật" };
  }

  revalidatePath("/pipeline");
  return { success: true };
}
