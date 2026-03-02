"use client";

import { useEffect, useState } from "react";
import { getStageChecklist, toggleChecklistItem } from "@/lib/actions/activity-actions";
import type { LeadActivity } from "@/lib/types/leads";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ListChecks } from "lucide-react";

interface StageNextStepsChecklistProps {
  leadId: string;
  currentStage: string;
  onChecklistChanged?: () => void;
}

export function StageNextStepsChecklist({
  leadId,
  currentStage,
  onChecklistChanged,
}: StageNextStepsChecklistProps) {
  const [items, setItems] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function fetchChecklist() {
      setLoading(true);
      const result = await getStageChecklist(leadId, currentStage);
      if (ignore) return;
      if (result.data) {
        setItems(result.data);
      }
      setLoading(false);
    }
    fetchChecklist();
    return () => { ignore = true; };
  }, [leadId, currentStage]);

  async function handleToggle(activityId: string, currentCompleted: boolean) {
    setUpdatingId(activityId);
    const result = await toggleChecklistItem(activityId, !currentCompleted);
    setUpdatingId(null);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    // Optimistic update
    setItems((prev) =>
      prev.map((item) =>
        item.id === activityId
          ? {
              ...item,
              status: !currentCompleted ? "completed" : "pending",
              metadata: { ...(item.metadata ?? {}), completed: !currentCompleted },
            }
          : item
      )
    );
    onChecklistChanged?.();
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 animate-pulse rounded bg-muted" />
        ))}
      </div>
    );
  }

  if (items.length === 0) return null;

  const completedCount = items.filter(
    (item) => (item.metadata as Record<string, unknown>)?.completed === true
  ).length;

  return (
    <div className="rounded-lg border bg-card p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ListChecks className="size-4 text-primary" />
          Bước tiếp theo
        </div>
        <span className="text-xs text-muted-foreground">
          {completedCount}/{items.length} bước hoàn thành
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div
          className="h-1.5 rounded-full bg-primary transition-all"
          style={{ width: `${items.length > 0 ? (completedCount / items.length) * 100 : 0}%` }}
        />
      </div>

      <div className="space-y-1">
        {items.map((item) => {
          const meta = (item.metadata ?? {}) as Record<string, unknown>;
          const isCompleted = meta.completed === true;

          return (
            <label
              key={item.id}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 cursor-pointer"
            >
              <Checkbox
                checked={isCompleted}
                disabled={updatingId === item.id}
                onCheckedChange={() => handleToggle(item.id, isCompleted)}
              />
              <span
                className={`text-sm ${isCompleted ? "line-through text-muted-foreground" : ""}`}
              >
                {item.content}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
