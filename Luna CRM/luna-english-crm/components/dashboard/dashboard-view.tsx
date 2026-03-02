"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  fetchDashboardData,
  fetchPreviousPeriod,
  type DashboardData,
} from "@/lib/actions/dashboard-actions";
import type { DateRange } from "@/lib/queries/dashboard-queries";
import {
  DateRangeFilter,
  type DateRangeValue,
} from "@/components/dashboard/date-range-filter";
import { KpiCardsRow } from "@/components/dashboard/kpi-cards-row";
import { PipelineFunnelChart } from "@/components/dashboard/pipeline-funnel-chart";
import { LeadsBySourceChart } from "@/components/dashboard/leads-by-source-chart";
import { MonthlyTrendChart } from "@/components/dashboard/monthly-trend-chart";
import { AdvisorPerformanceTable } from "@/components/dashboard/advisor-performance-table";

function getDefault30Days(): DateRangeValue {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date();
  from.setDate(from.getDate() - 30);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

export function DashboardView() {
  const [dateRange, setDateRange] = useState<DateRangeValue>(
    getDefault30Days()
  );
  const [data, setData] = useState<DashboardData | null>(null);
  const [prev, setPrev] = useState<Pick<
    DashboardData,
    "totalLeads" | "conversionRate" | "avgResponseTime" | "activeStudents"
  > | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async (range: DateRangeValue) => {
    setLoading(true);
    try {
      const dr: DateRange = { from: range.from, to: range.to };
      const [dashResult, prevResult] = await Promise.all([
        fetchDashboardData(dr),
        fetchPreviousPeriod(dr),
      ]);

      if (dashResult.error) {
        toast.error(dashResult.error);
        return;
      }
      if (prevResult.error) {
        toast.error(prevResult.error);
        return;
      }

      setData(dashResult.data ?? null);
      setPrev(prevResult.data ?? null);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      toast.error("Không thể tải dữ liệu dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(dateRange);
  }, [dateRange, loadData]);

  function handleDateRangeChange(range: DateRangeValue) {
    setDateRange(range);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bao cao</h1>
          <p className="text-muted-foreground">Dashboard va thong ke</p>
        </div>
        <DateRangeFilter value={dateRange} onChange={handleDateRangeChange} />
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : data && prev ? (
        <>
          <KpiCardsRow
            totalLeads={data.totalLeads}
            conversionRate={data.conversionRate}
            avgResponseTime={data.avgResponseTime}
            activeStudents={data.activeStudents}
            prevTotalLeads={prev.totalLeads}
            prevConversionRate={prev.conversionRate}
            prevAvgResponseTime={prev.avgResponseTime}
            prevActiveStudents={prev.activeStudents}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <PipelineFunnelChart data={data.funnel} />
            <LeadsBySourceChart data={data.sources} />
          </div>

          <MonthlyTrendChart data={data.monthlyTrend} />

          <AdvisorPerformanceTable data={data.advisorPerformance} />
        </>
      ) : (
        <p className="text-muted-foreground">Khong co du lieu</p>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl border bg-muted" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-[380px] rounded-xl border bg-muted" />
        <div className="h-[380px] rounded-xl border bg-muted" />
      </div>
      <div className="h-[380px] rounded-xl border bg-muted" />
      <div className="h-48 rounded-xl border bg-muted" />
    </div>
  );
}
