"use server";

import { createClient } from "@/lib/supabase/server";

// Normalize Vietnamese phone: +84xxx or 0xxx → +84xxx
function normalizeVietnamesePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("84")) return `+${digits}`;
  if (digits.startsWith("0")) return `+84${digits.slice(1)}`;
  return `+84${digits}`;
}

/**
 * Send a Zalo message to a lead (queues it for delivery).
 * Looks up zalo_user_id by lead_id first, then falls back to phone match.
 */
export async function sendZaloMessage(
  leadId: string,
  message: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Step 1: Direct lead_id match
  const { data: directMatch } = await supabase
    .from("zalo_followers")
    .select("zalo_user_id")
    .eq("lead_id", leadId)
    .single();

  let zaloUserId = directMatch?.zalo_user_id ?? null;

  // Step 2: Fallback to phone match
  if (!zaloUserId) {
    const { data: lead } = await supabase
      .from("leads")
      .select("parent_phone")
      .eq("id", leadId)
      .single();

    if (lead?.parent_phone) {
      const normalized = normalizeVietnamesePhone(lead.parent_phone);
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

        zaloUserId = phoneMatch?.zalo_user_id ?? null;
      }
    }
  }

  if (!zaloUserId) {
    return { error: "Lead chưa kết nối Zalo" };
  }

  return queueMessage("zalo", zaloUserId, { text: message }, leadId);
}

/**
 * Queue a message for delivery via the message queue.
 */
export async function queueMessage(
  provider: string,
  recipientId: string,
  payload: Record<string, unknown>,
  leadId?: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from("message_queue").insert({
    provider,
    recipient_id: recipientId,
    message_type: "text",
    payload,
    status: "pending",
    lead_id: leadId ?? null,
  });

  if (error) return { error: error.message };
  return { success: true };
}
