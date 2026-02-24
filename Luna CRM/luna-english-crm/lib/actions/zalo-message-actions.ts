"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { LeadStage } from "@/lib/types/leads";

// Normalize Vietnamese phone: +84xxx or 0xxx → +84xxx
function normalizeVietnamesePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("84")) return `+${digits}`;
  if (digits.startsWith("0")) return `+84${digits.slice(1)}`;
  return `+84${digits}`;
}

// Render template by replacing {{param}} placeholders with values
function renderTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

export interface ZaloMessageTemplate {
  id: string;
  name: string;
  template_key: string;
  stage: LeadStage | null;
  body_text: string;
  params: string[];
  is_active: boolean;
}

/**
 * Fetch Zalo message templates, optionally filtered by lead stage.
 */
export async function getZaloTemplates(
  stage?: LeadStage
): Promise<{ data?: ZaloMessageTemplate[]; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  let query = supabase
    .from("zalo_message_templates")
    .select("id, name, template_key, stage, body_text, params, is_active")
    .eq("is_active", true)
    .order("name");

  if (stage) {
    // Return templates for the specific stage + generic (null stage)
    query = query.or(`stage.eq.${stage},stage.is.null`);
  }

  const { data, error } = await query;
  if (error) return { error: error.message };
  return { data: data as ZaloMessageTemplate[] };
}

/**
 * Look up Zalo UID for a lead: try lead_id match first, fallback to phone.
 */
async function lookupZaloUid(
  supabase: Awaited<ReturnType<typeof createClient>>,
  leadId: string,
  parentPhone: string | null
): Promise<string | null> {
  // Step 1: Direct lead_id match
  const { data: directMatch } = await supabase
    .from("zalo_followers")
    .select("zalo_user_id")
    .eq("lead_id", leadId)
    .single();

  if (directMatch?.zalo_user_id) return directMatch.zalo_user_id;

  // Step 2: Phone number fallback — find other leads with same phone who have zalo_followers
  if (parentPhone) {
    const normalized = normalizeVietnamesePhone(parentPhone);
    // Find leads with matching phone, then check if they have zalo_followers
    const { data: phoneLeads } = await supabase
      .from("leads")
      .select("id")
      .or(
        `parent_phone.eq.${normalized},parent_phone.eq.${normalized.replace("+84", "0")}`
      );

    if (phoneLeads?.length) {
      const leadIds = phoneLeads.map((l) => l.id);
      const { data: phoneMatch } = await supabase
        .from("zalo_followers")
        .select("zalo_user_id")
        .in("lead_id", leadIds)
        .limit(1)
        .single();

      if (phoneMatch?.zalo_user_id) return phoneMatch.zalo_user_id;
    }
  }

  return null;
}

/**
 * Check if a lead has a Zalo connection (follower record).
 */
export async function checkZaloConnection(
  leadId: string
): Promise<{ connected: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { connected: false, error: "Unauthorized" };

  // Load lead for phone fallback
  const { data: lead } = await supabase
    .from("leads")
    .select("parent_phone")
    .eq("id", leadId)
    .single();

  const zaloUid = await lookupZaloUid(supabase, leadId, lead?.parent_phone ?? null);
  return { connected: !!zaloUid };
}

/**
 * Send a Zalo message to a lead using a template or custom body.
 */
export async function sendZaloTemplateMessage(
  leadId: string,
  templateKey: string,
  customBody?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  // Validate UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(leadId)) {
    return { success: false, error: "Invalid lead ID" };
  }

  // Load lead
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, parent_name, student_name, parent_phone, current_stage")
    .eq("id", leadId)
    .single();

  if (leadError || !lead) {
    return { success: false, error: "Không tìm thấy lead" };
  }

  // Lookup Zalo UID
  const zaloUid = await lookupZaloUid(supabase, leadId, lead.parent_phone);
  if (!zaloUid) {
    return { success: false, error: "Lead chưa kết nối Zalo OA" };
  }

  // Determine message body
  let messageBody: string;
  if (customBody?.trim()) {
    messageBody = customBody.trim();
  } else {
    // Load template
    const { data: template } = await supabase
      .from("zalo_message_templates")
      .select("body_text")
      .eq("template_key", templateKey)
      .single();

    if (!template) {
      return { success: false, error: "Không tìm thấy mẫu tin nhắn" };
    }

    // Render template with lead vars
    messageBody = renderTemplate(template.body_text, {
      parent_name: lead.parent_name ?? "",
      student_name: lead.student_name ?? "",
    });
  }

  // Sanitize: strip control characters
  messageBody = messageBody.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

  // Queue for delivery via message_queue
  const { error: queueError } = await supabase.from("message_queue").insert({
    provider: "zalo",
    recipient_id: zaloUid,
    message_type: "text",
    payload: { text: messageBody },
    status: "pending",
    lead_id: leadId,
  });

  if (queueError) {
    return { success: false, error: "Lỗi khi xếp hàng tin nhắn" };
  }

  // Log activity
  await supabase.from("lead_activities").insert({
    lead_id: leadId,
    type: "message",
    content: messageBody,
    created_by: user.id,
    metadata: { channel: "zalo", template_key: templateKey },
  });

  revalidatePath("/pipeline");
  return { success: true };
}
