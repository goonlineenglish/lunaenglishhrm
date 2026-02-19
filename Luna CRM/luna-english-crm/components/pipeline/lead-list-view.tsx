"use client";

import type { LeadWithAssignee } from "@/lib/hooks/use-realtime-leads";
import { getStageConfig } from "@/lib/constants/pipeline-stages";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const SOURCE_LABELS: Record<string, string> = {
  facebook: "Facebook",
  zalo: "Zalo",
  walk_in: "Walk-in",
  website: "Website",
  phone: "Điện thoại",
  referral: "Giới thiệu",
};

const PROGRAM_LABELS: Record<string, string> = {
  buttercup: "Buttercup",
  primary_success: "Primary Success",
  secondary: "Secondary",
  ielts: "IELTS",
};

interface LeadListViewProps {
  leads: LeadWithAssignee[];
  onLeadSelect: (lead: LeadWithAssignee) => void;
}

export function LeadListView({ leads, onLeadSelect }: LeadListViewProps) {
  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tên phụ huynh</TableHead>
            <TableHead>SĐT</TableHead>
            <TableHead>Học sinh</TableHead>
            <TableHead>Nguồn</TableHead>
            <TableHead>Chương trình</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Tư vấn viên</TableHead>
            <TableHead>Ngày tạo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                Không có lead nào
              </TableCell>
            </TableRow>
          ) : (
            leads.map((lead) => {
              const stageConfig = getStageConfig(lead.current_stage);
              return (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onLeadSelect(lead)}
                >
                  <TableCell className="font-medium">
                    {lead.parent_name}
                  </TableCell>
                  <TableCell>{lead.parent_phone}</TableCell>
                  <TableCell>{lead.student_name ?? "—"}</TableCell>
                  <TableCell>
                    {SOURCE_LABELS[lead.source] ?? lead.source}
                  </TableCell>
                  <TableCell>
                    {lead.program_interest
                      ? PROGRAM_LABELS[lead.program_interest] ??
                        lead.program_interest
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(stageConfig?.color)}
                    >
                      {stageConfig?.label ?? lead.current_stage}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {lead.users?.full_name ?? "Chưa gán"}
                  </TableCell>
                  <TableCell>{formatDate(lead.created_at)}</TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
