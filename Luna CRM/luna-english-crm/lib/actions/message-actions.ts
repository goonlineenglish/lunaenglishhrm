"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Send a Zalo message to a lead (queues it for delivery).
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

  // Find the lead's Zalo user ID via zalo_followers
  const { data: follower } = await supabase
    .from("zalo_followers")
    .select("zalo_user_id")
    .eq("lead_id", leadId)
    .single();

  if (!follower?.zalo_user_id) {
    return { error: "Lead chưa kết nối Zalo" };
  }

  return queueMessage("zalo", follower.zalo_user_id, { text: message }, leadId);
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
