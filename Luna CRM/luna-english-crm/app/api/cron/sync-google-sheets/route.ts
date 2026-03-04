import { NextRequest, NextResponse } from "next/server";
import { syncAllToSheets } from "@/lib/integrations/google-sheets-sync";

/**
 * CRON: Sync CRM data to Google Sheets (every 15min).
 */
export async function GET(request: NextRequest) {
  // Verify cron secret — fail-closed: deny if secret missing or mismatch
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncAllToSheets();
    const status = result.success ? 200 : 502;
    return NextResponse.json(result, { status });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
