"use client";

import { useDroppable } from "@dnd-kit/core";
import type { PipelineStageConfig } from "@/lib/constants/pipeline-stages";
import type { LeadWithAssignee } from "@/lib/hooks/use-realtime-leads";
import { LeadCard } from "@/components/pipeline/lead-card";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  stage: PipelineStageConfig;
  leads: LeadWithAssignee[];
  onLeadSelect: (lead: LeadWithAssignee) => void;
}

export function KanbanColumn({
  stage,
  leads,
  onLeadSelect,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-lg border p-3",
        stage.bgColor,
        isOver && "ring-2 ring-primary/50"
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className={cn("text-sm font-semibold", stage.color)}>
          {stage.label}
        </h3>
        <span
          className={cn(
            "inline-flex size-6 items-center justify-center rounded-full text-xs font-medium",
            stage.color,
            "bg-white/60"
          )}
        >
          {leads.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onClick={() => onLeadSelect(lead)}
          />
        ))}
        {leads.length === 0 && (
          <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
            Kéo lead vào đây
          </div>
        )}
      </div>
    </div>
  );
}
