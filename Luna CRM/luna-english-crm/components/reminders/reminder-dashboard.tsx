"use client";

import { useState } from "react";
import { isPast, isToday, addDays, startOfDay, endOfDay } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReminderSection } from "@/components/reminders/reminder-section";
import { CreateReminderDialog } from "@/components/reminders/create-reminder-dialog";
import type { ReminderWithLead } from "@/lib/actions/reminder-actions";

interface ReminderDashboardProps {
  reminders: ReminderWithLead[];
}

export function ReminderDashboard({ reminders }: ReminderDashboardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const upcomingEnd = endOfDay(addDays(now, 7));

  const overdue = reminders.filter((r) => {
    const remindAt = new Date(r.remind_at);
    return isPast(remindAt) && !isToday(remindAt);
  });

  const today = reminders.filter((r) => {
    const remindAt = new Date(r.remind_at);
    return remindAt >= todayStart && remindAt <= todayEnd;
  });

  const upcoming = reminders.filter((r) => {
    const remindAt = new Date(r.remind_at);
    return remindAt > todayEnd && remindAt <= upcomingEnd;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Nhac nho</h1>
          <p className="text-muted-foreground mt-1">
            Quan ly lich follow-up
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Tao nhac nho
        </Button>
      </div>

      <ReminderSection
        title="Qua han"
        reminders={overdue}
        variant="destructive"
      />

      <ReminderSection title="Hom nay" reminders={today} variant="default" />

      <ReminderSection
        title="Sap toi"
        reminders={upcoming}
        variant="secondary"
      />

      {overdue.length === 0 && today.length === 0 && upcoming.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">Khong co nhac nho nao</p>
          <p className="text-sm mt-1">
            Tao nhac nho moi de theo doi lead cua ban
          </p>
        </div>
      )}

      <CreateReminderDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
