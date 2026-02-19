"use client";

import { useState } from "react";
import { formatDistanceToNow, isPast, isToday } from "date-fns";
import { vi } from "date-fns/locale";
import { CheckCircle2, SkipForward, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { REMINDER_TYPES } from "@/lib/constants/reminder-types";
import { completeReminder, skipReminder } from "@/lib/actions/reminder-actions";
import type { ReminderWithLead } from "@/lib/actions/reminder-actions";

interface ReminderCardProps {
  reminder: ReminderWithLead;
}

export function ReminderCard({ reminder }: ReminderCardProps) {
  const [loading, setLoading] = useState<"complete" | "skip" | null>(null);
  const remindAt = new Date(reminder.remind_at);
  const overdue = isPast(remindAt) && reminder.status === "pending";
  const typeConfig = REMINDER_TYPES[reminder.type];

  const relativeTime = overdue
    ? `Qua han ${formatDistanceToNow(remindAt, { locale: vi })}`
    : isToday(remindAt)
      ? `Hom nay, ${remindAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`
      : `${formatDistanceToNow(remindAt, { locale: vi, addSuffix: true })}`;

  async function handleComplete() {
    setLoading("complete");
    const result = await completeReminder(reminder.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Da hoan thanh nhac nho");
    }
    setLoading(null);
  }

  async function handleSkip() {
    setLoading("skip");
    const result = await skipReminder(reminder.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Da bo qua nhac nho");
    }
    setLoading(null);
  }

  const leadName =
    reminder.leads?.student_name || reminder.leads?.parent_name || "N/A";

  return (
    <Card
      className={`p-4 ${overdue ? "border-destructive bg-destructive/5" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium truncate">{leadName}</span>
            <Badge variant={overdue ? "destructive" : "secondary"}>
              {typeConfig.label}
            </Badge>
          </div>
          <div
            className={`text-sm flex items-center gap-1 ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}
          >
            {overdue && <AlertTriangle className="h-3 w-3" />}
            {relativeTime}
          </div>
          {reminder.note && (
            <p className="text-sm text-muted-foreground mt-1 truncate">
              {reminder.note}
            </p>
          )}
          {reminder.leads?.parent_phone && (
            <p className="text-xs text-muted-foreground mt-1">
              {reminder.leads.parent_phone}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleComplete}
            disabled={loading !== null}
            title="Hoan thanh"
          >
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSkip}
            disabled={loading !== null}
            title="Bo qua"
          >
            <SkipForward className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
