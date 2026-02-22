import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import {
  verifyWebhook,
  verifyPayloadSignature,
} from "@/lib/integrations/facebook-client";
import { handleLeadgen } from "@/lib/integrations/facebook-webhook-handler";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET: Facebook webhook verification (hub.mode, hub.verify_token, hub.challenge)
 */
export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const challenge = verifyWebhook(params);

  if (challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

/**
 * POST: Handle incoming Facebook webhook events
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("X-Hub-Signature-256") ?? "";

  // Verify payload signature
  if (!verifyPayloadSignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Process webhook events synchronously, return 200 after completion
  const response = NextResponse.json({ received: true }, { status: 200 });

  const supabase = getAdminClient();
  try {
    const payload = JSON.parse(body);

    if (payload.object !== "page") {
      return response;
    }

    const entries = payload.entry ?? [];
    for (const entry of entries) {
      const eventType =
        entry.changes?.[0]?.field ?? "unknown";

      // Log to webhook_events
      const { data: eventRecord } = await supabase
        .from("webhook_events")
        .insert({
          provider: "facebook",
          event_type: eventType,
          payload: entry,
          status: "received",
        })
        .select("id")
        .single();

      // Process leadgen events
      try {
        await handleLeadgen(entry);
        if (eventRecord?.id) {
          await supabase
            .from("webhook_events")
            .update({
              status: "processed",
              processed_at: new Date().toISOString(),
            })
            .eq("id", eventRecord.id);
        }
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        if (eventRecord?.id) {
          await supabase
            .from("webhook_events")
            .update({ status: "failed", error_message: errorMessage })
            .eq("id", eventRecord.id);
        }
      }
    }
  } catch {
    // Still return 200 even if processing fails
  }

  return response;
}
