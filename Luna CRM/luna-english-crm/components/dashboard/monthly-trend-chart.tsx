"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MonthlyTrendItem } from "@/lib/queries/dashboard-queries";

interface MonthlyTrendChartProps {
  data: MonthlyTrendItem[];
}

export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Xu huong theo thang</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip contentStyle={{ borderRadius: 8 }} />
              <Legend />
              <Line
                type="monotone"
                dataKey="leads"
                stroke="#3FA5DC"
                strokeWidth={2}
                name="Tong leads"
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="enrolled"
                stroke="#00B273"
                strokeWidth={2}
                name="Da dang ky"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
