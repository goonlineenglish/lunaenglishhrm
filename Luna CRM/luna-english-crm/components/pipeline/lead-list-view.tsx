"use client";

import { useState } from "react";
import type { LeadWithAssignee } from "@/lib/hooks/use-realtime-leads";
import type { UserRole } from "@/lib/types/users";
import type { LeadStage } from "@/lib/types/leads";
import { PIPELINE_STAGES, getStageConfig } from "@/lib/constants/pipeline-stages";
import { updateLeadStage } from "@/lib/actions/lead-actions";
import { StatusChangeConfirmationDialog } from "@/components/shared/status-change-confirmation-dialog";
import { LeadBulkActionBar } from "@/components/pipeline/lead-bulk-action-bar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  userRole: UserRole;
}

export function LeadListView({ leads, onLeadSelect, userRole }: LeadListViewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingLeadId, setPendingLeadId] = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const canEdit = userRole !== "marketing";

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map((l) => l.id)));
    }
  }

  async function handleInlineStageChange(leadId: string, newStage: LeadStage, reason?: string) {
    setConfirmLoading(true);
    try {
      const result = await updateLeadStage(leadId, newStage, reason);
      if (result.error) toast.error(result.error);
      else toast.success("Đã chuyển trạng thái lead");
    } catch {
      toast.error("Lỗi cập nhật");
    } finally {
      setConfirmLoading(false);
      setConfirmOpen(false);
      setPendingLeadId(null);
    }
  }

  function handleStageSelect(leadId: string, newStage: LeadStage) {
    if (newStage === "mat_lead") {
      setPendingLeadId(leadId);
      setConfirmOpen(true);
    } else {
      handleInlineStageChange(leadId, newStage);
    }
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {canEdit && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={leads.length > 0 && selectedIds.size === leads.length}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
              )}
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
                <TableCell colSpan={canEdit ? 9 : 8} className="text-center text-muted-foreground">
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
                    {canEdit && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(lead.id)}
                          onCheckedChange={() => toggleSelect(lead.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{lead.parent_name}</TableCell>
                    <TableCell>{lead.parent_phone}</TableCell>
                    <TableCell>{lead.student_name ?? "—"}</TableCell>
                    <TableCell>{SOURCE_LABELS[lead.source] ?? lead.source}</TableCell>
                    <TableCell>
                      {lead.program_interest
                        ? PROGRAM_LABELS[lead.program_interest] ?? lead.program_interest
                        : "—"}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {canEdit ? (
                        <Select
                          value={lead.current_stage}
                          onValueChange={(v) => handleStageSelect(lead.id, v as LeadStage)}
                        >
                          <SelectTrigger className="h-7 w-[160px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PIPELINE_STAGES.map((stage) => (
                              <SelectItem key={stage.id} value={stage.id}>
                                <span className="flex items-center gap-2">
                                  <span className={cn("inline-block size-2 rounded-full", stage.bgColor.split(" ")[0])} />
                                  {stage.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className={cn(stageConfig?.color)}>
                          {stageConfig?.label ?? lead.current_stage}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{lead.users?.full_name ?? "Chưa gán"}</TableCell>
                    <TableCell>{formatDate(lead.created_at)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {canEdit && (
        <LeadBulkActionBar
          selectedIds={Array.from(selectedIds)}
          onClearSelection={() => setSelectedIds(new Set())}
          onDone={() => setSelectedIds(new Set())}
        />
      )}

      <StatusChangeConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Xác nhận mất lead"
        description="Vui lòng nhập lý do mất lead."
        requireReason
        loading={confirmLoading}
        onConfirm={(reason) => {
          if (pendingLeadId) handleInlineStageChange(pendingLeadId, "mat_lead", reason);
        }}
      />
    </>
  );
}
