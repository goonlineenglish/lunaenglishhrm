"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { LeadWithAssignee } from "@/lib/hooks/use-realtime-leads";
import { LeadCardSlaTimer } from "@/components/pipeline/lead-card-sla-timer";
import { AddScheduledActivityDialog } from "@/components/pipeline/add-scheduled-activity-dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Phone, Globe, MessageCircle, Users, Megaphone, Share2 } from "lucide-react";

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
}

export function LeadCard({ lead, onClick, isDragOverlay }: LeadCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: lead.id,
    });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const SourceIcon = SOURCE_ICONS[lead.source] ?? Megaphone;

  return (
    <div
      ref={!isDragOverlay ? setNodeRef : undefined}
      style={style}
      {...(!isDragOverlay ? { ...listeners, ...attributes } : {})}
      onClick={isDragging ? undefined : onClick}
      className={cn(
        "cursor-pointer rounded-md border bg-white p-3 shadow-sm transition-shadow hover:shadow-md",
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
        <SourceIcon className="size-4 shrink-0 text-muted-foreground" />
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
  );
}
