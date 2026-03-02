"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Lead, LeadSource, LeadStage, ProgramType } from "@/lib/types/leads";
import { ensureUserProfile } from "./ensure-user-profile";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface CreateLeadInput {
  parent_name: string;
  parent_phone: string;
  source: LeadSource;
  program_interest?: ProgramType | null;
  student_name?: string | null;
  notes?: string | null;
}

export interface UpdateLeadInput {
  parent_name?: string;
  parent_phone?: string;
  parent_email?: string | null;
  parent_address?: string | null;
  student_name?: string | null;
  student_dob?: string | null;
  source?: LeadSource;
  referral_code?: string | null;
  program_interest?: ProgramType | null;
  expected_class?: string | null;
  notes?: string | null;
  lost_reason?: string | null;
  assigned_to?: string | null;
}

export async function createLead(input: CreateLeadInput) {
  try {
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

    if (!input.source) {
      return { error: "Vui lòng chọn nguồn" };
    }

    const phone = input.parent_phone.replace(/\D/g, "");
    if (phone.length !== 10) {
      return { error: "Số điện thoại phải có 10 chữ số" };
    }

    const { data, error } = await supabase
      .from("leads")
      .insert({
        parent_name: input.parent_name.trim(),
        parent_phone: phone,
        source: input.source,
        program_interest: input.program_interest ?? null,
        student_name: input.student_name?.trim() || null,
        notes: input.notes?.trim() || null,
        current_stage: "moi_tiep_nhan" as LeadStage,
        assigned_to: null,
      })
      .select()
      .single();

    if (error) {
      console.error("createLead error:", error.message, error.code);
      if (error.code === "42501") {
        return { error: "Bạn không có quyền tạo lead. Kiểm tra role trong hệ thống." };
      }
      return { error: "Đã xảy ra lỗi. Vui lòng thử lại." };
    }

    if (!data) {
      console.error("createLead: insert returned no data (RLS may be blocking)");
      return { error: "Không thể tạo lead. Kiểm tra quyền truy cập." };
    }

    revalidatePath("/pipeline");
    return { data: data as Lead };
  } catch (error) {
    console.error("createLead unexpected error:", error);
    return { error: "Đã xảy ra lỗi. Vui lòng thử lại." };
  }
}

export async function updateLead(leadId: string, input: UpdateLeadInput) {
  if (!UUID_RE.test(leadId)) return { error: "ID không hợp lệ" };
  try {
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

    if (input.parent_phone) {
      const phone = input.parent_phone.replace(/\D/g, "");
      if (phone.length !== 10) {
        return { error: "Số điện thoại phải có 10 chữ số" };
      }
      input.parent_phone = phone;
    }

    const { data, error } = await supabase
      .from("leads")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", leadId)
      .select()
      .single();

    if (error) {
      console.error("updateLead error:", error.message);
      return { error: "Đã xảy ra lỗi. Vui lòng thử lại." };
    }

    revalidatePath("/pipeline");
    return { data: data as Lead };
  } catch (error) {
    console.error("updateLead unexpected error:", error);
    return { error: "Đã xảy ra lỗi. Vui lòng thử lại." };
  }
}

export async function updateLeadStage(
  leadId: string,
  newStage: LeadStage,
  lostReason?: string
) {
  if (!UUID_RE.test(leadId)) return { error: "ID không hợp lệ" };
  try {
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

    // Get current stage
    const { data: currentLead, error: fetchError } = await supabase
      .from("leads")
      .select("current_stage")
      .eq("id", leadId)
      .single();

    if (fetchError || !currentLead) {
      return { error: "Không tìm thấy lead" };
    }

    const fromStage = currentLead.current_stage;

    // Require lost reason when moving to mat_lead
    if (newStage === "mat_lead" && !lostReason?.trim()) {
      return { error: "Vui lòng nhập lý do mất lead" };
    }

    const updateData: Record<string, unknown> = {
      current_stage: newStage,
      updated_at: new Date().toISOString(),
    };
    if (newStage === "mat_lead" && lostReason) {
      updateData.lost_reason = lostReason;
    }

    const { data, error } = await supabase
      .from("leads")
      .update(updateData)
      .eq("id", leadId)
      .select()
      .single();

    if (error) {
      console.error("updateLeadStage error:", error.message, "| code:", error.code, "| details:", error.details, "| hint:", error.hint);
      return { error: "Đã xảy ra lỗi. Vui lòng thử lại." };
    }

    // Auto-log stage_change activity
    await supabase.from("lead_activities").insert({
      lead_id: leadId,
      type: "stage_change",
      content: `Chuyển từ ${fromStage} sang ${newStage}`,
      created_by: user.id,
      metadata: { from: fromStage, to: newStage },
    });

    revalidatePath("/pipeline");
    return { data: data as Lead };
  } catch (error) {
    console.error("updateLeadStage unexpected error:", error);
    return { error: "Đã xảy ra lỗi. Vui lòng thử lại." };
  }
}

export async function deleteLead(leadId: string) {
  if (!UUID_RE.test(leadId)) return { error: "ID không hợp lệ" };
  try {
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

    const { error } = await supabase.from("leads").delete().eq("id", leadId);

    if (error) {
      console.error("deleteLead error:", error.message);
      return { error: "Đã xảy ra lỗi. Vui lòng thử lại." };
    }

    revalidatePath("/pipeline");
    return { success: true };
  } catch (error) {
    console.error("deleteLead unexpected error:", error);
    return { error: "Đã xảy ra lỗi. Vui lòng thử lại." };
  }
}

export interface BulkResult {
  succeeded: string[];
  failed: { id: string; error: string }[];
}

export async function bulkUpdateLeadStage(
  leadIds: string[],
  newStage: LeadStage,
  lostReason?: string
): Promise<BulkResult> {
  const result: BulkResult = { succeeded: [], failed: [] };

  if (newStage === "mat_lead" && !lostReason?.trim()) {
    return { succeeded: [], failed: leadIds.map((id) => ({ id, error: "Thiếu lý do mất lead" })) };
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { succeeded: [], failed: leadIds.map((id) => ({ id, error: "Chưa đăng nhập" })) };
    }

    const profileResult = await ensureUserProfile(supabase, user);
    if ("error" in profileResult) {
      return { succeeded: [], failed: leadIds.map((id) => ({ id, error: profileResult.error })) };
    }

    for (const leadId of leadIds) {
      if (!UUID_RE.test(leadId)) {
        result.failed.push({ id: leadId, error: "ID không hợp lệ" });
        continue;
      }

      const { data: currentLead } = await supabase
        .from("leads")
        .select("current_stage")
        .eq("id", leadId)
        .single();

      if (!currentLead) {
        result.failed.push({ id: leadId, error: "Không tìm thấy lead" });
        continue;
      }

      const updateData: Record<string, unknown> = {
        current_stage: newStage,
        updated_at: new Date().toISOString(),
      };
      if (newStage === "mat_lead" && lostReason) {
        updateData.lost_reason = lostReason;
      }

      const { error } = await supabase
        .from("leads")
        .update(updateData)
        .eq("id", leadId);

      if (error) {
        result.failed.push({ id: leadId, error: "Lỗi cập nhật" });
      } else {
        // Log activity
        await supabase.from("lead_activities").insert({
          lead_id: leadId,
          type: "stage_change",
          content: `Chuyển từ ${currentLead.current_stage} sang ${newStage}`,
          created_by: user.id,
          metadata: { from: currentLead.current_stage, to: newStage },
        });
        result.succeeded.push(leadId);
      }
    }

    revalidatePath("/pipeline");
    return result;
  } catch (error) {
    console.error("bulkUpdateLeadStage unexpected error:", error);
    return { succeeded: [], failed: leadIds.map((id) => ({ id, error: "Lỗi hệ thống" })) };
  }
}

export async function assignLead(leadId: string, advisorId: string | null) {
  if (!UUID_RE.test(leadId)) return { error: "ID không hợp lệ" };
  try {
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
      .from("leads")
      .update({
        assigned_to: advisorId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId)
      .select()
      .single();

    if (error) {
      console.error("assignLead error:", error.message);
      return { error: "Đã xảy ra lỗi. Vui lòng thử lại." };
    }

    revalidatePath("/pipeline");
    return { data: data as Lead };
  } catch (error) {
    console.error("assignLead unexpected error:", error);
    return { error: "Đã xảy ra lỗi. Vui lòng thử lại." };
  }
}
