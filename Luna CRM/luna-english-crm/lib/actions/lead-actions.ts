"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Lead, LeadSource, LeadStage, ProgramType } from "@/lib/types/leads";

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
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Chưa đăng nhập" };
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
    return { error: error.message };
  }

  revalidatePath("/pipeline");
  return { data: data as Lead };
}

export async function updateLead(leadId: string, input: UpdateLeadInput) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Chưa đăng nhập" };
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
    return { error: error.message };
  }

  revalidatePath("/pipeline");
  return { data: data as Lead };
}

export async function updateLeadStage(
  leadId: string,
  newStage: LeadStage,
  lostReason?: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Chưa đăng nhập" };
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
    return { error: error.message };
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
}

export async function deleteLead(leadId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Chưa đăng nhập" };
  }

  const { error } = await supabase.from("leads").delete().eq("id", leadId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/pipeline");
  return { success: true };
}

export async function assignLead(leadId: string, advisorId: string | null) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Chưa đăng nhập" };
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
    return { error: error.message };
  }

  revalidatePath("/pipeline");
  return { data: data as Lead };
}
