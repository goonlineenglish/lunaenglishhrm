"use client";

import { useState } from "react";
import { updateActivityStatus } from "@/lib/actions/scheduled-activity-actions";
import { softDeleteActivity } from "@/lib/actions/soft-delete-actions";
import type { LeadActivity } from "@/lib/types/leads";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Phone,
  MessageCircle,
  MessageSquare,
  Users,
  FileText,
  ArrowRight,
  Calendar,
  PhoneCall,
  GraduationCap,
  Headphones,
  CheckSquare,
  Check,
  X,
  Mail,
  Trash2,
} from "lucide-react";

const VN_TZ = "Asia/Ho_Chi_Minh";

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  call: Phone,
  message: MessageCircle,
  meeting: Users,
  note: FileText,
  stage_change: ArrowRight,
  trial_booked: Calendar,
  scheduled_call: PhoneCall,
  trial_class: GraduationCap,
  consultation: Headphones,
  checklist: CheckSquare,
};

const ACTIVITY_LABELS: Record<string, string> = {
  call: "Gọi điện",
  message: "Nhắn tin",
  meeting: "Gặp mặt",
  note: "Ghi chú",
  stage_change: "Chuyển trạng thái",
  trial_booked: "Đặt lịch học thử",
  scheduled_call: "Cuộc gọi lên lịch",
  trial_class: "Học thử",
  consultation: "Tư vấn",
  checklist: "Checklist",
};

function formatVnDate(utcStr: string): string {
  const vnDate = toZonedTime(new Date(utcStr), VN_TZ);
  return format(vnDate, "dd/MM/yyyy HH:mm");
}

function getStatusBadge(activity: LeadActivity) {
  if (activity.status === "completed") {
    return <Badge className="bg-green-100 text-green-700">Đã xong</Badge>;
  }
  if (activity.status === "cancelled") {
    return <Badge variant="secondary">Đã hủy</Badge>;
  }
  // pending — check if overdue
  if (activity.schedule_to && new Date(activity.schedule_to) < new Date()) {
    return <Badge className="bg-red-100 text-red-700">Quá hạn</Badge>;
  }
  return <Badge className="bg-yellow-100 text-yellow-700">Sắp tới</Badge>;
}

interface ScheduledActivityListProps {
  activities: LeadActivity[];
  onStatusChanged: () => void;
}

export function ScheduledActivityList({
  activities,
  onStatusChanged,
}: ScheduledActivityListProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function handleStatus(id: string, status: "completed" | "cancelled") {
    setUpdatingId(id);
    const result = await updateActivityStatus(id, status);
    setUpdatingId(null);
    if (!result.success) {
      toast.error(result.error ?? "Lỗi");
      return;
    }
    toast.success(status === "completed" ? "Đã hoàn thành" : "Đã hủy");
    onStatusChanged();
  }

  async function handleDelete(id: string) {
    setUpdatingId(id);
    const result = await softDeleteActivity(id);
    setUpdatingId(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Đã xóa hoạt động");
    onStatusChanged();
  }

  if (activities.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Chưa có hoạt động nào
      </p>
    );
  }

  // Sort: scheduled activities by schedule_from, then non-scheduled by created_at
  const sorted = [...activities].sort((a, b) => {
    const aDate = a.schedule_from ?? a.created_at;
    const bDate = b.schedule_from ?? b.created_at;
    return new Date(aDate).getTime() - new Date(bDate).getTime();
  });

  return (
    <div className="space-y-3">
      {sorted.map((activity) => {
        const meta = (activity.metadata ?? {}) as Record<string, unknown>;
        const isEmail = activity.type === "message" && meta.channel === "email";
        const isZalo = activity.type === "message" && meta.channel === "zalo";
        const Icon = isZalo
          ? MessageSquare
          : isEmail
            ? Mail
            : (ACTIVITY_ICONS[activity.type] ?? FileText);
        const label = isZalo
          ? "Zalo"
          : isEmail
            ? "Email"
            : (ACTIVITY_LABELS[activity.type] ?? activity.type);
        const isScheduled = !!activity.schedule_from;
        const isStageChange = activity.type === "stage_change";

        return (
          <div
            key={activity.id}
            className={cn(
              "flex gap-3 rounded-md border p-3",
              isStageChange && "border-blue-200 bg-blue-50",
              activity.status === "completed" && "opacity-60"
            )}
          >
            <div
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full",
                isStageChange
                  ? "bg-blue-100 text-blue-700"
                  : isZalo
                    ? "bg-sky-100 text-sky-700"
                    : isEmail
                      ? "bg-purple-100 text-purple-700"
                      : "bg-muted text-muted-foreground"
              )}
            >
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={isStageChange ? "default" : "secondary"} className="text-xs">
                  {label}
                </Badge>
                {isScheduled && getStatusBadge(activity)}
              </div>
              {activity.title && (
                <p className="mt-1 text-sm font-medium">{activity.title}</p>
              )}
              {activity.content && (
                <p className="mt-0.5 text-sm text-muted-foreground">{activity.content}</p>
              )}
              {isScheduled && activity.schedule_from && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatVnDate(activity.schedule_from)}
                  {activity.schedule_to && ` → ${formatVnDate(activity.schedule_to)}`}
                  {activity.location && ` | ${activity.location}`}
                </p>
              )}
              {!isScheduled && (
                <span className="text-xs text-muted-foreground">
                  {formatVnDate(activity.created_at)}
                </span>
              )}
            </div>
            {isScheduled && activity.status === "pending" && (
              <div className="flex shrink-0 flex-col gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-green-600"
                  title="Hoàn thành"
                  disabled={updatingId === activity.id}
                  onClick={() => handleStatus(activity.id, "completed")}
                >
                  <Check className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-red-500"
                  title="Hủy"
                  disabled={updatingId === activity.id}
                  onClick={() => handleStatus(activity.id, "cancelled")}
                >
                  <X className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-destructive"
                  title="Xóa"
                  disabled={updatingId === activity.id}
                  onClick={() => handleDelete(activity.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
