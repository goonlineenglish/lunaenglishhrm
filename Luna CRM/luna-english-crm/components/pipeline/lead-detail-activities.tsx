"use client";

import { useEffect, useState, useCallback } from "react";
import { getActivities } from "@/lib/actions/activity-actions";
import { AddActivityForm } from "@/components/pipeline/add-activity-form";
import type { LeadActivity } from "@/lib/types/leads";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Phone, MessageCircle, Users, FileText, ArrowRight, Calendar } from "lucide-react";

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  call: Phone,
  message: MessageCircle,
  meeting: Users,
  note: FileText,
  stage_change: ArrowRight,
  trial_booked: Calendar,
};

const ACTIVITY_LABELS: Record<string, string> = {
  call: "Gọi điện",
  message: "Nhắn tin",
  meeting: "Gặp mặt",
  note: "Ghi chú",
  stage_change: "Chuyển trạng thái",
  trial_booked: "Đặt lịch học thử",
};

interface LeadDetailActivitiesProps {
  leadId: string;
}

export function LeadDetailActivities({ leadId }: LeadDetailActivitiesProps) {
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const loadActivities = useCallback(async () => {
    setLoading(true);
    const result = await getActivities(leadId);
    if (result.data) {
      setActivities(result.data);
    }
    setLoading(false);
  }, [leadId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    loadActivities();
  }, [loadActivities]);

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-4">
      <AddActivityForm leadId={leadId} onActivityAdded={loadActivities} />
      <Separator />

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          Chưa có hoạt động nào
        </p>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => {
            const Icon = ACTIVITY_ICONS[activity.type] ?? FileText;
            const isStageChange = activity.type === "stage_change";

            return (
              <div
                key={activity.id}
                className={cn(
                  "flex gap-3 rounded-md border p-3",
                  isStageChange && "border-blue-200 bg-blue-50"
                )}
              >
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full",
                    isStageChange
                      ? "bg-blue-100 text-blue-700"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={isStageChange ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {ACTIVITY_LABELS[activity.type] ?? activity.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(activity.created_at)}
                    </span>
                  </div>
                  {activity.content && (
                    <p className="mt-1 text-sm">{activity.content}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
