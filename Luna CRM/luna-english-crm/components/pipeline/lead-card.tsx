"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { LeadWithAssignee } from "@/lib/hooks/use-realtime-leads";
import type { UserRole } from "@/lib/types/users";
import type { LeadStage } from "@/lib/types/leads";
import { PIPELINE_STAGES } from "@/lib/constants/pipeline-stages";
import { updateLeadStage } from "@/lib/actions/lead-actions";
import { StatusChangeConfirmationDialog } from "@/components/shared/status-change-confirmation-dialog";
import { LeadCardSlaTimer } from "@/components/pipeline/lead-card-sla-timer";
import { AddScheduledActivityDialog } from "@/components/pipeline/add-scheduled-activity-dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Phone, Globe, MessageCircle, Users, Megaphone, Share2, MoreHorizontal, Check } from "lucide-react";
import { toast } from "sonner";

const SOURCE_ICONS: Record<string, React.ElementType> = {
  facebook: Globe,
  zalo: MessageCircle,
  walk_in: Users,
  website: Globe,
  phone: Phone,
  referral: Share2,
};

const PROGRAM_LABELS: Record<string, string> = {
  buttercup: "Buttercup",
  primary_success: "Primary Success",
  secondary: "Secondary",
  ielts: "IELTS",
};

interface LeadCardProps {
  lead: LeadWithAssignee;
  onClick?: () => void;
  isDragOverlay?: boolean;
  userRole?: UserRole;
}

export function LeadCard({ lead, onClick, isDragOverlay, userRole }: LeadCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingStage, setPendingStage] = useState<LeadStage | null>(null);
  const [loading, setLoading] = useState(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: lead.id });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const SourceIcon = SOURCE_ICONS[lead.source] ?? Megaphone;

  async function handleStageChange(stage: LeadStage, reason?: string) {
    setLoading(true);
    try {
      const result = await updateLeadStage(lead.id, stage, reason);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Đã chuyển trạng thái lead");
      }
    } catch {
      toast.error("Lỗi cập nhật trạng thái");
    } finally {
      setLoading(false);
      setConfirmOpen(false);
      setPendingStage(null);
    }
  }

  function handleStageSelect(stage: LeadStage) {
    if (stage === lead.current_stage) return;
    if (stage === "mat_lead") {
      setPendingStage(stage);
      setConfirmOpen(true);
    } else {
      handleStageChange(stage);
    }
  }

  return (
    <>
      <div
        ref={!isDragOverlay ? setNodeRef : undefined}
        style={style}
        {...(!isDragOverlay ? { ...listeners, ...attributes } : {})}
        onClick={isDragging ? undefined : onClick}
        className={cn(
          "group relative cursor-pointer rounded-md border bg-white p-3 shadow-sm transition-shadow hover:shadow-md",
          isDragging && "opacity-50",
          isDragOverlay && "rotate-2 shadow-lg"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{lead.student_name || lead.parent_name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {lead.parent_phone}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <SourceIcon className="size-4 shrink-0 text-muted-foreground" />
            {userRole && userRole !== "marketing" && !isDragOverlay && (
              <div
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="rounded p-0.5 opacity-0 hover:bg-muted group-hover:opacity-100">
                      <MoreHorizontal className="size-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {PIPELINE_STAGES.map((stage) => (
                      <DropdownMenuItem
                        key={stage.id}
                        disabled={stage.id === lead.current_stage}
                        onClick={() => handleStageSelect(stage.id)}
                      >
                        <span className={cn("mr-2 inline-block size-2 rounded-full", stage.bgColor.split(" ")[0].replace("bg-", "bg-"))} />
                        {stage.label}
                        {stage.id === lead.current_stage && (
                          <Check className="ml-auto size-4" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>

        {lead.program_interest && (
          <Badge variant="secondary" className="mt-2 text-xs">
            {PROGRAM_LABELS[lead.program_interest] ?? lead.program_interest}
          </Badge>
        )}

        {lead.parent_name && (
          <p className="mt-1 truncate text-xs text-muted-foreground">
            PH: {lead.parent_name}
          </p>
        )}

        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <LeadCardSlaTimer
              stage={lead.current_stage}
              createdAt={lead.created_at}
            />
            <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
              <AddScheduledActivityDialog
                leadId={lead.id}
                onActivityAdded={() => {}}
                triggerVariant="icon"
              />
            </div>
          </div>
          {lead.users?.full_name ? (
            <Avatar className="size-6">
              <AvatarFallback className="text-[10px]">
                {lead.users.full_name
                  .split(" ")
                  .map((w) => w[0])
                  .slice(-2)
                  .join("")
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            <span className="text-xs text-muted-foreground">Chưa gán</span>
          )}
        </div>
      </div>

      <StatusChangeConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Xác nhận mất lead"
        description="Bạn có chắc muốn đánh dấu lead này là mất? Vui lòng nhập lý do."
        requireReason
        loading={loading}
        onConfirm={(reason) => {
          if (pendingStage) handleStageChange(pendingStage, reason);
        }}
      />
    </>
  );
}
