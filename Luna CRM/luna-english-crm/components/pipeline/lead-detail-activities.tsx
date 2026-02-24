"use client";

import { useEffect, useState, useCallback } from "react";
import { getActivities } from "@/lib/actions/activity-actions";
import { AddScheduledActivityDialog } from "@/components/pipeline/add-scheduled-activity-dialog";
import { ScheduledActivityList } from "@/components/pipeline/scheduled-activity-list";
import { StageNextStepsChecklist } from "@/components/pipeline/stage-next-steps-checklist";
import type { LeadActivity } from "@/lib/types/leads";
import { Separator } from "@/components/ui/separator";

interface LeadDetailActivitiesProps {
  leadId: string;
  currentStage: string;
}

export function LeadDetailActivities({ leadId, currentStage }: LeadDetailActivitiesProps) {
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const loadActivities = useCallback(async () => {
    setLoading(true);
    const result = await getActivities(leadId);
    if (result.data) {
      // Filter out checklist items — shown separately
      setActivities(result.data.filter((a) => a.type !== "checklist"));
    }
    setLoading(false);
  }, [leadId]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  return (
    <div className="space-y-4">
      <StageNextStepsChecklist
        leadId={leadId}
        currentStage={currentStage}
        onChecklistChanged={loadActivities}
      />

      <AddScheduledActivityDialog leadId={leadId} onActivityAdded={loadActivities} />
      <Separator />

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : (
        <ScheduledActivityList
          activities={activities}
          onStatusChanged={loadActivities}
        />
      )}
    </div>
  );
}
