"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { PIPELINE_STAGES } from "@/lib/constants/pipeline-stages";
import { useOptimisticKanban } from "@/lib/hooks/use-optimistic-kanban";
import { updateLeadStage } from "@/lib/actions/lead-actions";
import { KanbanColumn } from "@/components/pipeline/kanban-column";
import { LeadCard } from "@/components/pipeline/lead-card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { LeadWithAssignee } from "@/lib/hooks/use-realtime-leads";
import type { LeadStage } from "@/lib/types/leads";
import type { UserRole } from "@/lib/types/users";
import { toast } from "sonner";

interface KanbanBoardProps {
  leadsByStage: Record<LeadStage, LeadWithAssignee[]>;
  leads: LeadWithAssignee[];
  setLeads: React.Dispatch<React.SetStateAction<LeadWithAssignee[]>>;
  onLeadSelect: (lead: LeadWithAssignee) => void;
  userRole: UserRole;
}

export function KanbanBoard({
  leadsByStage,
  leads,
  setLeads,
  onLeadSelect,
  userRole,
}: KanbanBoardProps) {
  const [activeLead, setActiveLead] = useState<LeadWithAssignee | null>(null);
  const { moveLeadOptimistic, revertMove, confirmMove } = useOptimisticKanban(
    leads,
    setLeads
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const lead = leads.find((l) => l.id === event.active.id);
      if (lead) setActiveLead(lead);
    },
    [leads]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveLead(null);
      const { active, over } = event;

      if (!over) return;

      const leadId = active.id as string;
      const overStage = over.id as LeadStage;

      // Check if dropped on a valid stage column
      const isStage = PIPELINE_STAGES.some((s) => s.id === overStage);
      if (!isStage) return;

      const lead = leads.find((l) => l.id === leadId);
      if (!lead || lead.current_stage === overStage) return;

      // Marketing users cannot move leads
      if (userRole === "marketing") {
        toast.error("Bạn không có quyền di chuyển lead");
        return;
      }

      moveLeadOptimistic(leadId, overStage);

      const result = await updateLeadStage(leadId, overStage);
      if (result.error) {
        revertMove();
        toast.error(result.error);
      } else {
        confirmMove();
        toast.success("Đã chuyển trạng thái lead");
      }
    },
    [leads, userRole, moveLeadOptimistic, revertMove, confirmMove]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4">
          {PIPELINE_STAGES.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              leads={leadsByStage[stage.id] ?? []}
              onLeadSelect={onLeadSelect}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <DragOverlay>
        {activeLead ? (
          <LeadCard lead={activeLead} isDragOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
