import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setHours(23, 59, 59, 999);

  const periodStart = new Date(now);
  periodStart.setDate(periodStart.getDate() - 7);
  periodStart.setHours(0, 0, 0, 0);

  const fromIso = periodStart.toISOString();
  const toIso = periodEnd.toISOString();

  const [
    { count: totalLeads },
    { count: convertedLeads },
    { count: activeStudents },
    { data: funnelData },
    { data: sourceData },
  ] = await Promise.all([
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .gte("created_at", fromIso)
      .lte("created_at", toIso),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("current_stage", "da_dang_ky")
      .gte("created_at", fromIso)
      .lte("created_at", toIso),
    supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("status", "active"),
    supabase
      .from("lead_funnel")
      .select("current_stage, lead_count, stage_order"),
    supabase.from("lead_source_breakdown").select("source, lead_count"),
  ]);

  const total = totalLeads ?? 0;
  const converted = convertedLeads ?? 0;
  const conversionRate =
    total > 0 ? Math.round((converted / total) * 100 * 10) / 10 : 0;

  const reportData = {
    totalLeads: total,
    convertedLeads: converted,
    conversionRate,
    activeStudents: activeStudents ?? 0,
    funnel: funnelData ?? [],
    sources: sourceData ?? [],
  };

  const { error } = await supabase.from("reports").insert({
    report_type: "weekly",
    period_start: periodStart.toISOString().split("T")[0],
    period_end: periodEnd.toISOString().split("T")[0],
    data: reportData,
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to insert report", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: reportData });
}
