"use client";

import {
  Users,
  ArrowRightLeft,
  Clock,
  GraduationCap,
  DollarSign,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";

interface KpiCardsRowProps {
  totalLeads: number;
  conversionRate: number;
  avgResponseTime: number;
  activeStudents: number;
  prevTotalLeads: number;
  prevConversionRate: number;
  prevAvgResponseTime: number;
  prevActiveStudents: number;
}

function calcTrend(current: number, prev: number): number | null {
  if (prev === 0) return current > 0 ? 100 : null;
  return ((current - prev) / prev) * 100;
}

export function KpiCardsRow({
  totalLeads,
  conversionRate,
  avgResponseTime,
  activeStudents,
  prevTotalLeads,
  prevConversionRate,
  prevAvgResponseTime,
  prevActiveStudents,
}: KpiCardsRowProps) {
  const estimatedRevenue = activeStudents * 2_500_000;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      <KpiCard
        icon={Users}
        label="Tong leads"
        value={totalLeads.toString()}
        trend={calcTrend(totalLeads, prevTotalLeads)}
      />
      <KpiCard
        icon={ArrowRightLeft}
        label="Ty le chuyen doi"
        value={`${conversionRate}%`}
        trend={calcTrend(conversionRate, prevConversionRate)}
      />
      <KpiCard
        icon={Clock}
        label="TG phan hoi TB"
        value={`${avgResponseTime}h`}
        trend={
          prevAvgResponseTime === 0
            ? null
            : calcTrend(prevAvgResponseTime, avgResponseTime)
        }
      />
      <KpiCard
        icon={GraduationCap}
        label="HS dang hoc"
        value={activeStudents.toString()}
        trend={calcTrend(activeStudents, prevActiveStudents)}
      />
      <KpiCard
        icon={DollarSign}
        label="DT du kien"
        value={new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: "VND",
          maximumFractionDigits: 0,
        }).format(estimatedRevenue)}
        trend={null}
      />
    </div>
  );
}
