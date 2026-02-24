import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sendTextMessage } from "./zalo-client";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** Exponential backoff delays in seconds: 1s, 5s, 30s, 5min, 1h */
const BACKOFF_DELAYS = [1, 5, 30, 300, 3600];

function getNextRetryDelay(attempts: number): number {
  const index = Math.min(attempts, BACKOFF_DELAYS.length - 1);
  return BACKOFF_DELAYS[index];
}

/**
 * Process pending/failed messages from the message_queue table.
 * Uses atomic claim to prevent race conditions when multiple workers run.
 * Exponential backoff for retries, max 5 attempts.
 */
export async function processQueue(): Promise<{
  processed: number;
  failed: number;
}> {
  const supabase = getAdminClient();
  let processed = 0;
  let failed = 0;

  // Fetch messages ready for processing
  const now = new Date().toISOString();
  const { data: messages } = await supabase
    .from("message_queue")
    .select("*")
    .in("status", ["pending", "failed"])
    .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
    .lt("attempts", 5)
    .order("created_at", { ascending: true })
    .limit(50);

  if (!messages?.length) return { processed: 0, failed: 0 };

  for (const msg of messages) {
    // Atomic claim: only update if status hasn't changed (prevents race condition)
    const { data: claimed } = await supabase
      .from("message_queue")
      .update({ status: "processing" })
      .eq("id", msg.id)
      .in("status", ["pending", "failed"])
      .select("id")
      .single();

    // Another worker already claimed this message — skip
    if (!claimed) continue;

    try {
      if (msg.provider === "zalo") {
        // Get Zalo access token
        const { data: tokenRow } = await supabase
          .from("integration_tokens")
          .select("access_token")
          .eq("provider", "zalo")
          .eq("is_active", true)
          .single();

        if (!tokenRow?.access_token) {
          throw new Error("No active Zalo token");
        }

        const result = await sendTextMessage(
          tokenRow.access_token,
          msg.recipient_id,
          msg.payload?.text ?? ""
        );

        if (result.error !== 0) {
          throw new Error(result.message ?? `Zalo API error: ${result.error}`);
        }
      } else {
        throw new Error(`Unsupported provider: ${msg.provider}`);
      }

      // Mark as sent
      await supabase
        .from("message_queue")
        .update({
          status: "sent",
          attempts: msg.attempts + 1,
        })
        .eq("id", msg.id);
      processed++;
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error";
      const newAttempts = msg.attempts + 1;
      const newStatus = newAttempts >= msg.max_attempts ? "failed" : "pending";
      const delaySec = getNextRetryDelay(newAttempts - 1);
      const nextRetry = new Date(Date.now() + delaySec * 1000).toISOString();

      await supabase
        .from("message_queue")
        .update({
          status: newStatus,
          attempts: newAttempts,
          last_error: errorMessage,
          next_retry_at: newAttempts >= msg.max_attempts ? null : nextRetry,
        })
        .eq("id", msg.id);
      failed++;
    }
  }

  return { processed, failed };
}
