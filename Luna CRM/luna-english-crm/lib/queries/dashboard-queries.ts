import type { SupabaseClient } from "@supabase/supabase-js";

export interface DateRange {
  from: Date;
  to: Date;
}

export interface FunnelItem {
  stage: string;
  label: string;
  count: number;
}

export interface SourceItem {
  source: string;
  label: string;
  count: number;
}

export interface MonthlyTrendItem {
  month: string;
  leads: number;
  enrolled: number;
}

export interface AdvisorPerformanceItem {
  advisor_id: string;
  advisor_name: string;
  total_leads: number;
  converted: number;
  conversion_rate: number;
}

const SOURCE_LABELS: Record<string, string> = {
  facebook: "Facebook",
  zalo: "Zalo",
  walk_in: "Walk-in",
  website: "Website",
  phone: "Điện thoại",
  referral: "Giới thiệu",
};

const STAGE_LABELS: Record<string, string> = {
  moi_tiep_nhan: "Mới tiếp nhận",
  da_tu_van: "Đã tư vấn / Đang nurture",
  dang_nurture: "Kiểm tra đầu vào",
  dat_lich_hoc_thu: "Đặt lịch học thử",
  dang_hoc_thu: "Đang học thử",
  cho_chot: "Chờ chốt",
  da_dang_ky: "Đã đăng ký",
  mat_lead: "Mất lead",
};

export async function queryTotalLeads(
  supabase: SupabaseClient,
  dateRange: DateRange
): Promise<number> {
  const { count } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .is("deleted_at", null)
    .gte("created_at", dateRange.from.toISOString())
    .lte("created_at", dateRange.to.toISOString());
  return count ?? 0;
}

export async function queryConversionRate(
  supabase: SupabaseClient,
  dateRange: DateRange
): Promise<number> {
  const { count: total } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .is("deleted_at", null)
    .gte("created_at", dateRange.from.toISOString())
    .lte("created_at", dateRange.to.toISOString());

  const { count: converted } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .is("deleted_at", null)
    .eq("current_stage", "da_dang_ky")
    .gte("created_at", dateRange.from.toISOString())
    .lte("created_at", dateRange.to.toISOString());

  if (!total || total === 0) return 0;
  return Math.round(((converted ?? 0) / total) * 100 * 10) / 10;
}

export async function queryAvgResponseTime(
  supabase: SupabaseClient,
  dateRange: DateRange
): Promise<number> {
  const { data } = await supabase
    .from("lead_activities")
    .select("lead_id, created_at")
    .is("deleted_at", null)
    .in("type", ["call", "message"])
    .gte("created_at", dateRange.from.toISOString())
    .lte("created_at", dateRange.to.toISOString())
    .order("created_at", { ascending: true });

  if (!data || data.length === 0) return 0;

  const { data: leads } = await supabase
    .from("leads")
    .select("id, created_at")
    .is("deleted_at", null)
    .gte("created_at", dateRange.from.toISOString())
    .lte("created_at", dateRange.to.toISOString());

  if (!leads || leads.length === 0) return 0;

  const leadCreatedMap = new Map<string, Date>();
  for (const lead of leads) {
    leadCreatedMap.set(lead.id, new Date(lead.created_at));
  }

  let totalHours = 0;
  let count = 0;
  const firstResponse = new Map<string, Date>();

  for (const activity of data) {
    if (!firstResponse.has(activity.lead_id)) {
      firstResponse.set(activity.lead_id, new Date(activity.created_at));
    }
  }

  for (const [leadId, responseAt] of firstResponse) {
    const createdAt = leadCreatedMap.get(leadId);
    if (createdAt) {
      const diffMs = responseAt.getTime() - createdAt.getTime();
      totalHours += diffMs / (1000 * 60 * 60);
      count++;
    }
  }

  if (count === 0) return 0;
  return Math.round((totalHours / count) * 10) / 10;
}

export async function queryActiveStudents(
  supabase: SupabaseClient
): Promise<number> {
  const { count } = await supabase
    .from("students")
    .select("*", { count: "exact", head: true })
    .is("deleted_at", null)
    .eq("status", "active");
  return count ?? 0;
}

export async function queryFunnelData(
  supabase: SupabaseClient
): Promise<FunnelItem[]> {
  const { data } = await supabase
    .from("lead_funnel")
    .select("current_stage, lead_count, stage_order")
    .order("stage_order", { ascending: true });

  if (!data) return [];

  return data.map((row) => ({
    stage: row.current_stage,
    label: STAGE_LABELS[row.current_stage] ?? row.current_stage,
    count: row.lead_count,
  }));
}

export async function querySourceBreakdown(
  supabase: SupabaseClient
): Promise<SourceItem[]> {
  const { data } = await supabase
    .from("lead_source_breakdown")
    .select("source, lead_count");

  if (!data) return [];

  return data.map((row) => ({
    source: row.source,
    label: SOURCE_LABELS[row.source] ?? row.source,
    count: row.lead_count,
  }));
}

export async function queryMonthlyTrend(
  supabase: SupabaseClient
): Promise<MonthlyTrendItem[]> {
  const { data: trendData } = await supabase
    .from("monthly_lead_trend")
    .select("month, lead_count");

  if (!trendData) return [];

  const { data: enrolledData } = await supabase
    .from("leads")
    .select("created_at")
    .is("deleted_at", null)
    .eq("current_stage", "da_dang_ky");

  const enrolledByMonth = new Map<string, number>();
  if (enrolledData) {
    for (const lead of enrolledData) {
      const d = new Date(lead.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      enrolledByMonth.set(key, (enrolledByMonth.get(key) ?? 0) + 1);
    }
  }

  return trendData.map((row) => {
    const d = new Date(row.month);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthLabel = `T${d.getMonth() + 1}/${d.getFullYear()}`;
    return {
      month: monthLabel,
      leads: row.lead_count,
      enrolled: enrolledByMonth.get(key) ?? 0,
    };
  });
}

export async function queryAdvisorPerformance(
  supabase: SupabaseClient
): Promise<AdvisorPerformanceItem[]> {
  const { data } = await supabase
    .from("advisor_performance")
    .select("advisor_id, advisor_name, total_leads, converted, conversion_rate")
    .order("conversion_rate", { ascending: false });

  if (!data) return [];

  return data.map((row) => ({
    advisor_id: row.advisor_id,
    advisor_name: row.advisor_name,
    total_leads: row.total_leads,
    converted: row.converted,
    conversion_rate: Number(row.conversion_rate),
  }));
}
