import { NextRequest, NextResponse } from "next/server";
import { verifySignature } from "@/lib/integrations/zalo-client";
import { getZaloMessageId } from "@/lib/integrations/webhook-idempotency";
import { processEvent } from "@/lib/integrations/zalo-webhook-handler";
import { getAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("X-Zalo-Signature") ?? "";
  const secret = process.env.ZALO_OA_SECRET;

  if (!secret) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  // Verify signature
  try {
    if (!verifySignature(body, signature, secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Parse and log webhook event
  const supabase = getAdminClient();
  try {
    const event = JSON.parse(body);
    const eventType = event.event_name ?? "unknown";
    const msgId = getZaloMessageId(event);

    // Idempotency: skip if this event was already processed
    // msg_id is stored in payload.message.msg_id (nested), so query accordingly
    if (msgId) {
      const { data: existing } = await supabase
        .from("webhook_events")
        .select("id")
        .eq("provider", "zalo")
        .eq("status", "processed")
        .eq("payload->message->>msg_id", msgId)
        .limit(1)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ received: true }, { status: 200 });
      }
    }

    // Log to webhook_events and capture the inserted record ID
    const { data: eventRecord } = await supabase
      .from("webhook_events")
      .insert({
        provider: "zalo",
        event_type: eventType,
        payload: event,
        status: "received",
      })
      .select("id")
      .single();

    // Await processing before returning
    try {
      await processEvent(event);
      if (eventRecord?.id) {
        await supabase
          .from("webhook_events")
          .update({ status: "processed", processed_at: new Date().toISOString() })
          .eq("id", eventRecord.id);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      if (eventRecord?.id) {
        await supabase
          .from("webhook_events")
          .update({ status: "failed", error_message: errorMessage })
          .eq("id", eventRecord.id);
      }
    }
  } catch {
    // Still return 200 — Zalo requires 200 to stop retrying
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
