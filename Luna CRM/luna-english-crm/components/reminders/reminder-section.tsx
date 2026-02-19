"use client";

import { Badge } from "@/components/ui/badge";
import { ReminderCard } from "@/components/reminders/reminder-card";
import type { ReminderWithLead } from "@/lib/actions/reminder-actions";

interface ReminderSectionProps {
  title: string;
  reminders: ReminderWithLead[];
  variant?: "destructive" | "default" | "secondary";
}

export function ReminderSection({
  title,
  reminders,
  variant = "default",
}: ReminderSectionProps) {
  if (reminders.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Badge variant={variant}>{reminders.length}</Badge>
      </div>
      <div className="space-y-2">
        {reminders.map((reminder) => (
          <ReminderCard key={reminder.id} reminder={reminder} />
        ))}
      </div>
    </div>
  );
}
