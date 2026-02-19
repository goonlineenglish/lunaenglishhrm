"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { AdvisorPerformanceItem } from "@/lib/queries/dashboard-queries";

interface AdvisorPerformanceTableProps {
  data: AdvisorPerformanceItem[];
}

export function AdvisorPerformanceTable({
  data,
}: AdvisorPerformanceTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hieu suat tu van vien</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tu van vien</TableHead>
              <TableHead className="text-right">Tong leads</TableHead>
              <TableHead className="text-right">Da chuyen doi</TableHead>
              <TableHead className="text-right">Ty le</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Chua co du lieu
                </TableCell>
              </TableRow>
            )}
            {data.map((advisor) => (
              <TableRow key={advisor.advisor_id}>
                <TableCell className="font-medium">
                  {advisor.advisor_name}
                </TableCell>
                <TableCell className="text-right">
                  {advisor.total_leads}
                </TableCell>
                <TableCell className="text-right">
                  {advisor.converted}
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={
                      advisor.conversion_rate >= 30 ? "default" : "secondary"
                    }
                  >
                    {advisor.conversion_rate}%
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
