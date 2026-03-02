"use client";

import { useCallback, useRef } from "react";
import type { LeadWithAssignee } from "@/lib/hooks/use-realtime-leads";
import type { LeadStage } from "@/lib/types/leads";

interface MoveSnapshot {
  leadId: string;
  fromStage: LeadStage;
}

export function useOptimisticKanban(
  leads: LeadWithAssignee[],
  setLeads: React.Dispatch<React.SetStateAction<LeadWithAssignee[]>>
) {
  const snapshotRef = useRef<MoveSnapshot | null>(null);

  const moveLeadOptimistic = useCallback(
    (leadId: string, toStage: LeadStage) => {
      const lead = leads.find((l) => l.id === leadId);
      if (!lead) return;

      snapshotRef.current = {
        leadId,
        fromStage: lead.current_stage,
      };

      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId ? { ...l, current_stage: toStage } : l
        )
      );
    },
    [leads, setLeads]
  );

  const revertMove = useCallback(() => {
    const snapshot = snapshotRef.current;
    if (!snapshot) return;

    setLeads((prev) =>
      prev.map((l) =>
        l.id === snapshot.leadId
          ? { ...l, current_stage: snapshot.fromStage }
          : l
      )
    );

    snapshotRef.current = null;
  }, [setLeads]);

  const confirmMove = useCallback(() => {
    snapshotRef.current = null;
  }, []);

  return { moveLeadOptimistic, revertMove, confirmMove };
}
