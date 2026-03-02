"use client";

import { useState } from "react";
import type { LeadWithAssignee } from "@/lib/hooks/use-realtime-leads";
import type { Lead, LeadStage } from "@/lib/types/leads";
import type { UserRole } from "@/lib/types/users";
import { updateLeadStage } from "@/lib/actions/lead-actions";
import { PIPELINE_STAGES, getStageConfig } from "@/lib/constants/pipeline-stages";
import { StatusChangeConfirmationDialog } from "@/components/shared/status-change-confirmation-dialog";
import { LeadDetailEditForm } from "@/components/pipeline/lead-detail-edit-form";
import { AssignAdvisorSelect } from "@/components/pipeline/assign-advisor-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Check, ChevronDown } from "lucide-react";

interface Advisor {
  id: string;
  full_name: string;
  role: string;
}

interface LeadDetailInfoProps {
  lead: LeadWithAssignee;
  advisors: Advisor[];
  userRole: UserRole;
  onLeadUpdated: (lead: Lead) => void;
}

export function LeadDetailInfo({ lead, advisors, userRole, onLeadUpdated }: LeadDetailInfoProps) {
  const [editing, setEditing] = useState(false);
  const [stagePopoverOpen, setStagePopoverOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [stageLoading, setStageLoading] = useState(false);
  const stageConfig = getStageConfig(lead.current_stage);

  async function handleStageChange(stage: LeadStage, reason?: string) {
    setStageLoading(true);
    try {
      const result = await updateLeadStage(lead.id, stage, reason);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Đã chuyển trạng thái lead");
        if (result.data) onLeadUpdated(result.data);
      }
    } catch {
      toast.error("Lỗi cập nhật trạng thái");
    } finally {
      setStageLoading(false);
      setConfirmOpen(false);
      setStagePopoverOpen(false);
    }
  }

  function handleStageSelect(stage: LeadStage) {
    if (stage === lead.current_stage) return;
    setStagePopoverOpen(false);
    if (stage === "mat_lead") {
      setConfirmOpen(true);
    } else {
      handleStageChange(stage);
    }
  }

  if (editing) {
    return (
      <LeadDetailEditForm
        lead={lead}
        onLeadUpdated={onLeadUpdated}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {userRole !== "marketing" ? (
          <Popover open={stagePopoverOpen} onOpenChange={setStagePopoverOpen}>
            <PopoverTrigger asChild>
              <button className="inline-flex items-center gap-1">
                <Badge className={cn(stageConfig?.color)} variant="outline">
                  {stageConfig?.label ?? lead.current_stage}
                  <ChevronDown className="ml-1 size-3" />
                </Badge>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-1" align="start">
              {PIPELINE_STAGES.map((stage) => (
                <button
                  key={stage.id}
                  disabled={stage.id === lead.current_stage}
                  onClick={() => handleStageSelect(stage.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted",
                    stage.id === lead.current_stage && "opacity-50"
                  )}
                >
                  <span className={cn("inline-block size-2 rounded-full", stage.bgColor.split(" ")[0])} />
                  {stage.label}
                  {stage.id === lead.current_stage && <Check className="ml-auto size-3" />}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        ) : (
          <Badge className={cn(stageConfig?.color)} variant="outline">
            {stageConfig?.label ?? lead.current_stage}
          </Badge>
        )}
        {userRole !== "marketing" && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Chỉnh sửa
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground">Tên phụ huynh</p>
          <p className="font-medium">{lead.parent_name}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Số điện thoại</p>
          <p className="font-medium">{lead.parent_phone}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Email</p>
          <p className="font-medium">{lead.parent_email ?? "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Địa chỉ</p>
          <p className="font-medium">{lead.parent_address ?? "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Tên học sinh</p>
          <p className="font-medium">{lead.student_name ?? "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Ngày sinh</p>
          <p className="font-medium">{lead.student_dob ?? "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Nguồn</p>
          <p className="font-medium">{lead.source}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Chương trình</p>
          <p className="font-medium">{lead.program_interest ?? "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Lớp dự kiến</p>
          <p className="font-medium">{lead.expected_class ?? "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Tư vấn viên</p>
          <p className="font-medium">{lead.users?.full_name ?? "Chưa gán"}</p>
        </div>
      </div>

      {lead.notes && (
        <div>
          <p className="text-sm text-muted-foreground">Ghi chú</p>
          <p className="text-sm">{lead.notes}</p>
        </div>
      )}

      {lead.lost_reason && (
        <div>
          <p className="text-sm text-muted-foreground">Lý do mất</p>
          <p className="text-sm text-red-600">{lead.lost_reason}</p>
        </div>
      )}

      {userRole === "admin" && (
        <div className="border-t pt-4">
          <Label className="mb-2 block text-sm">Phân công tư vấn viên</Label>
          <AssignAdvisorSelect
            leadId={lead.id}
            currentAdvisorId={lead.assigned_to}
            advisors={advisors}
            onAssigned={onLeadUpdated}
          />
        </div>
      )}

      <StatusChangeConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Xác nhận mất lead"
        description="Bạn có chắc muốn đánh dấu lead này là mất? Vui lòng nhập lý do."
        requireReason
        loading={stageLoading}
        onConfirm={(reason) => handleStageChange("mat_lead", reason)}
      />
    </div>
  );
}
