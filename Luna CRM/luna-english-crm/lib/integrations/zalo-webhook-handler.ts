import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getFollowerProfile } from "./zalo-client";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface ZaloEvent {
  event_name: string;
  sender?: { id: string };
  recipient?: { id: string };
  message?: { text?: string; msg_id?: string };
  timestamp?: string;
  user_id_by_app?: string;
  follower?: { id: string };
  info?: { display_name?: string; avatar?: string };
}

/**
 * Route Zalo webhook event to appropriate handler.
 */
export async function processEvent(event: ZaloEvent): Promise<void> {
  switch (event.event_name) {
    case "user_send_text":
      await handleUserSendText(event);
      break;
    case "follow":
    case "user_interested":
      await handleUserInterested(event);
      break;
    default:
      // Log unknown event types, no-op
      break;
  }
}

/**
 * Handle user_send_text: find or create lead from Zalo sender.
 */
async function handleUserSendText(event: ZaloEvent): Promise<void> {
  const supabase = getAdminClient();
  const zaloUserId = event.sender?.id;
  if (!zaloUserId) return;

  // Check if follower exists
  const { data: follower } = await supabase
    .from("zalo_followers")
    .select("id, lead_id")
    .eq("zalo_user_id", zaloUserId)
    .single();

  let leadId = follower?.lead_id;

  if (!leadId) {
    // Try to get profile info for name
    let displayName = "Zalo User";
    try {
      const { data: tokenRow } = await supabase
        .from("integration_tokens")
        .select("access_token")
        .eq("provider", "zalo")
        .eq("is_active", true)
        .single();

      if (tokenRow?.access_token) {
        const profile = await getFollowerProfile(
          tokenRow.access_token,
          zaloUserId
        );
        displayName = profile.data?.display_name ?? displayName;
      }
    } catch {
      // Use default name
    }

    // Create new lead
    const { data: newLead } = await supabase
      .from("leads")
      .insert({
        parent_name: displayName,
        parent_phone: "",
        source: "zalo",
        current_stage: "moi_tiep_nhan",
        notes: `Tin nhắn từ Zalo: ${event.message?.text ?? ""}`,
      })
      .select("id")
      .single();

    leadId = newLead?.id;

    // Link follower to lead
    if (leadId) {
      await supabase.from("zalo_followers").upsert(
        {
          zalo_user_id: zaloUserId,
          lead_id: leadId,
          display_name: displayName,
        },
        { onConflict: "zalo_user_id" }
      );
    }
  }

  // Log activity on the lead
  if (leadId) {
    await supabase.from("lead_activities").insert({
      lead_id: leadId,
      type: "message",
      content: event.message?.text ?? "(Zalo message)",
      metadata: { source: "zalo", zalo_user_id: zaloUserId },
    });
  }
}

/**
 * Handle user_interested / follow: create zalo_followers record.
 */
async function handleUserInterested(event: ZaloEvent): Promise<void> {
  const supabase = getAdminClient();
  const zaloUserId =
    event.follower?.id ?? event.sender?.id ?? event.user_id_by_app;
  if (!zaloUserId) return;

  const displayName = event.info?.display_name ?? null;
  const avatarUrl = event.info?.avatar ?? null;

  await supabase.from("zalo_followers").upsert(
    {
      zalo_user_id: zaloUserId,
      display_name: displayName,
      avatar_url: avatarUrl,
    },
    { onConflict: "zalo_user_id" }
  );
}
