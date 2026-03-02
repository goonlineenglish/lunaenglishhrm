"use client";

import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  trend: number | null;
}

export function KpiCard({ icon: Icon, label, value, trend }: KpiCardProps) {
  const isPositive = trend !== null && trend >= 0;
  const hasTrend = trend !== null && trend !== 0;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="rounded-lg bg-[#3E1A51]/10 p-2">
            <Icon className="h-5 w-5 text-[#3E1A51]" />
          </div>
          {hasTrend && (
            <div
              className={`flex items-center gap-1 text-sm font-medium ${
                isPositive ? "text-[#00B273]" : "text-[#EC3563]"
              }`}
            >
              {isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>{Math.abs(trend).toFixed(1)}%</span>
            </div>
          )}
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
