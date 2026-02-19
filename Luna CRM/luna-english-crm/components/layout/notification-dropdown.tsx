"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { NotificationItem } from "@/components/layout/notification-item";
import type { Notification } from "@/lib/actions/notification-actions";

interface NotificationDropdownProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

export function NotificationDropdown({
  notifications,
  onMarkRead,
  onMarkAllRead,
}: NotificationDropdownProps) {
  return (
    <div className="w-80">
      <div className="flex items-center justify-between px-3 py-2">
        <h3 className="font-semibold text-sm">Thong bao</h3>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-7"
          onClick={onMarkAllRead}
        >
          Danh dau da doc
        </Button>
      </div>
      <Separator />
      <ScrollArea className="h-80">
        {notifications.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            Khong co thong bao
          </div>
        ) : (
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onRead={onMarkRead}
            />
          ))
        )}
      </ScrollArea>
    </div>
  );
}
