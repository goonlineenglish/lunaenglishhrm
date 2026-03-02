"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { LeadStage, StageNote } from "@/lib/types/leads";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getStageNotes(
  leadId: string
): Promise<{ data?: StageNote[]; error?: string }> {
  if (!UUID_RE.test(leadId)) return { error: "ID không hợp lệ" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Chưa đăng nhập" };

  const { data, error } = await supabase
    .from("lead_stage_notes")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getStageNotes error:", error.message);
    return { error: "Đã xảy ra lỗi. Vui lòng thử lại." };
  }

  return { data: data as StageNote[] };
}

export async function saveStageNote(
  leadId: string,
  stage: LeadStage,
  input: { note?: string; result?: string; next_steps?: string }
): Promise<{ success: boolean; error?: string }> {
  if (!UUID_RE.test(leadId)) return { success: false, error: "ID không hợp lệ" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Chưa đăng nhập" };

  const { error } = await supabase.from("lead_stage_notes").insert({
    lead_id: leadId,
    stage,
    note: input.note?.trim() || null,
    result: input.result?.trim() || null,
    next_steps: input.next_steps?.trim() || null,
    created_by: user.id,
  });

  if (error) {
    console.error("saveStageNote error:", error.message);
    return { success: false, error: "Đã xảy ra lỗi. Vui lòng thử lại." };
  }

  revalidatePath("/pipeline");
  return { success: true };
}
