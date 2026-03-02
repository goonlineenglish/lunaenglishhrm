"use server";

import { createClient } from "@/lib/supabase/server";
import {
  queryTotalLeads,
  queryConversionRate,
  queryAvgResponseTime,
  queryActiveStudents,
  queryFunnelData,
  querySourceBreakdown,
  queryMonthlyTrend,
  queryAdvisorPerformance,
  type DateRange,
  type FunnelItem,
  type SourceItem,
  type MonthlyTrendItem,
  type AdvisorPerformanceItem,
} from "@/lib/queries/dashboard-queries";

export interface DashboardData {
  totalLeads: number;
  conversionRate: number;
  avgResponseTime: number;
  activeStudents: number;
  funnel: FunnelItem[];
  sources: SourceItem[];
  monthlyTrend: MonthlyTrendItem[];
  advisorPerformance: AdvisorPerformanceItem[];
}

export async function fetchDashboardData(
  dateRange: DateRange
): Promise<{ data?: DashboardData; error?: string }> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Chưa đăng nhập" };

    const [
      totalLeads,
      conversionRate,
      avgResponseTime,
      activeStudents,
      funnel,
      sources,
      monthlyTrend,
      advisorPerformance,
    ] = await Promise.all([
      queryTotalLeads(supabase, dateRange),
      queryConversionRate(supabase, dateRange),
      queryAvgResponseTime(supabase, dateRange),
      queryActiveStudents(supabase),
      queryFunnelData(supabase),
      querySourceBreakdown(supabase),
      queryMonthlyTrend(supabase),
      queryAdvisorPerformance(supabase),
    ]);

    return {
      data: {
        totalLeads,
        conversionRate,
        avgResponseTime,
        activeStudents,
        funnel,
        sources,
        monthlyTrend,
        advisorPerformance,
      },
    };
  } catch {
    return { error: "Không thể tải dữ liệu dashboard" };
  }
}

export async function fetchPreviousPeriod(
  dateRange: DateRange
): Promise<{ data?: Pick<DashboardData, "totalLeads" | "conversionRate" | "avgResponseTime" | "activeStudents">; error?: string }> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Chưa đăng nhập" };

    const durationMs = dateRange.to.getTime() - dateRange.from.getTime();
    const prevRange: DateRange = {
      from: new Date(dateRange.from.getTime() - durationMs),
      to: new Date(dateRange.from.getTime()),
    };

    const [totalLeads, conversionRate, avgResponseTime, activeStudents] =
      await Promise.all([
        queryTotalLeads(supabase, prevRange),
        queryConversionRate(supabase, prevRange),
        queryAvgResponseTime(supabase, prevRange),
        queryActiveStudents(supabase),
      ]);

    return { data: { totalLeads, conversionRate, avgResponseTime, activeStudents } };
  } catch {
    return { error: "Không thể tải dữ liệu kỳ trước" };
  }
}
