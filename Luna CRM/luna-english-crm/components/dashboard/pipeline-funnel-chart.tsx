"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FunnelItem } from "@/lib/queries/dashboard-queries";

const STAGE_COLORS: Record<string, string> = {
  moi_tiep_nhan: "#3FA5DC",
  da_tu_van: "#3E1A51",
  dang_nurture: "#7C3AED",
  dat_lich_hoc_thu: "#FFC021",
  dang_hoc_thu: "#F97316",
  cho_chot: "#06B6D4",
  da_dang_ky: "#00B273",
  mat_lead: "#EC3563",
};

interface PipelineFunnelChartProps {
  data: FunnelItem[];
}

export function PipelineFunnelChart({ data }: PipelineFunnelChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline Funnel</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 100 }}>
              <XAxis type="number" />
              <YAxis
                type="category"
                dataKey="label"
                width={100}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value) => [String(value), "Leads"]}
                contentStyle={{ borderRadius: 8 }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {data.map((entry) => (
                  <Cell
                    key={entry.stage}
                    fill={STAGE_COLORS[entry.stage] ?? "#3E1A51"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
