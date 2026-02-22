import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { refreshAccessToken } from "@/lib/integrations/zalo-client";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * CRON: Refresh expiring Zalo OA tokens (every 6h).
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getAdminClient();

  // Find Zalo tokens expiring within 12 hours
  const twelveHoursFromNow = new Date(
    Date.now() + 12 * 60 * 60 * 1000
  ).toISOString();

  const { data: tokens } = await supabase
    .from("integration_tokens")
    .select("*")
    .eq("provider", "zalo")
    .eq("is_active", true)
    .lt("token_expires_at", twelveHoursFromNow);

  if (!tokens?.length) {
    return NextResponse.json({ message: "No tokens to refresh" });
  }

  const results = [];
  for (const token of tokens) {
    if (!token.refresh_token) {
      results.push({ id: token.id, error: "No refresh token" });
      continue;
    }

    try {
      const refreshed = await refreshAccessToken(token.refresh_token);

      if (refreshed.access_token) {
        const expiresAt = refreshed.expires_in
          ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
          : null;

        await supabase
          .from("integration_tokens")
          .update({
            access_token: refreshed.access_token,
            refresh_token: refreshed.refresh_token ?? token.refresh_token,
            token_expires_at: expiresAt,
          })
          .eq("id", token.id);

        results.push({ id: token.id, refreshed: true });
      } else {
        results.push({
          id: token.id,
          error: refreshed.message ?? "Refresh failed",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      results.push({ id: token.id, error: msg });
    }
  }

  return NextResponse.json({ results });
}
