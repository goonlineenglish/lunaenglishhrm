import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { verifySignature } from "@/lib/integrations/zalo-client";
import { processEvent } from "@/lib/integrations/zalo-webhook-handler";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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

  // Return 200 immediately
  const response = NextResponse.json({ received: true }, { status: 200 });

  // Parse and log webhook event
  const supabase = getAdminClient();
  try {
    const event = JSON.parse(body);
    const eventType = event.event_name ?? "unknown";

    // Log to webhook_events
    await supabase.from("webhook_events").insert({
      provider: "zalo",
      event_type: eventType,
      payload: event,
      status: "received",
    });

    // Process asynchronously (best-effort within edge runtime)
    processEvent(event)
      .then(async () => {
        await supabase
          .from("webhook_events")
          .update({ status: "processed", processed_at: new Date().toISOString() })
          .eq("provider", "zalo")
          .eq("payload->>event_name", eventType)
          .order("created_at", { ascending: false })
          .limit(1);
      })
      .catch(async (err: Error) => {
        await supabase
          .from("webhook_events")
          .update({ status: "failed", error_message: err.message })
          .eq("provider", "zalo")
          .eq("payload->>event_name", eventType)
          .order("created_at", { ascending: false })
          .limit(1);
      });
  } catch {
    // Still return 200 even if processing fails
  }

  return response;
}
