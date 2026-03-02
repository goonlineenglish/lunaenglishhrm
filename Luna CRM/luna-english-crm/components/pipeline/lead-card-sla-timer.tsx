"use client";

import { useState, useEffect } from "react";
import { getStageConfig } from "@/lib/constants/pipeline-stages";
import type { LeadStage } from "@/lib/types/leads";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

interface LeadCardSlaTimerProps {
  stage: LeadStage;
  createdAt: string;
}

function computeSla(slaHours: number, createdAt: string) {
  const created = new Date(createdAt).getTime();
  const elapsed = Date.now() - created;
  const slaMs = slaHours * 60 * 60 * 1000;
  const remaining = slaMs - elapsed;

  if (remaining <= 0) {
    return { label: "Quá hạn", color: "text-red-600" };
  }

  const hoursLeft = remaining / (1000 * 60 * 60);

  if (hoursLeft <= slaHours * 0.25) {
    const mins = Math.floor(remaining / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return {
      label: h > 0 ? `${h}h ${m}m` : `${m}m`,
      color: "text-red-500",
    };
  }

  if (hoursLeft <= slaHours * 0.5) {
    const h = Math.floor(hoursLeft);
    return { label: `${h}h`, color: "text-yellow-600" };
  }

  const h = Math.floor(hoursLeft);
  return { label: `${h}h`, color: "text-green-600" };
}

export function LeadCardSlaTimer({ stage, createdAt }: LeadCardSlaTimerProps) {
  const config = getStageConfig(stage);
  // tick state forces re-render every 60s for live SLA updates
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  if (!config?.slaHours) return null;

  const slaStatus = computeSla(config.slaHours, createdAt);

  return (
    <div className={cn("flex items-center gap-1 text-xs", slaStatus.color)}>
      <Clock className="size-3" />
      <span>{slaStatus.label}</span>
    </div>
  );
}
