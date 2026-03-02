"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SourceItem } from "@/lib/queries/dashboard-queries";

const SOURCE_COLORS: Record<string, string> = {
  facebook: "#3FA5DC",
  zalo: "#3E1A51",
  walk_in: "#00B273",
  website: "#FFC021",
  phone: "#EC3563",
  referral: "#7C3AED",
};

interface LeadsBySourceChartProps {
  data: SourceItem[];
}

export function LeadsBySourceChart({ data }: LeadsBySourceChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Leads theo nguon</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }) =>
                  `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.source}
                    fill={SOURCE_COLORS[entry.source] ?? "#999"}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [String(value), "Leads"]}
                contentStyle={{ borderRadius: 8 }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
