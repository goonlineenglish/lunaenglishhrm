"use client";

import { Bell } from "lucide-react";

export function LeadDetailReminders() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Bell className="mb-3 size-10 text-muted-foreground/50" />
      <p className="text-sm font-medium text-muted-foreground">
        Nhắc nhở tự động
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Tính năng sẽ được triển khai ở Phase 4
      </p>
    </div>
  );
}
