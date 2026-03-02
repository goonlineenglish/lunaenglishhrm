"use client";

import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Bell,
  Info,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/actions/notification-actions";

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
}

const TYPE_ICONS: Record<Notification["type"], typeof Bell> = {
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
  success: CheckCircle2,
  reminder: Clock,
};

export function NotificationItem({
  notification,
  onRead,
}: NotificationItemProps) {
  const Icon = TYPE_ICONS[notification.type] || Bell;
  const relativeTime = formatDistanceToNow(new Date(notification.created_at), {
    locale: vi,
    addSuffix: true,
  });

  return (
    <button
      type="button"
      className={cn(
        "w-full text-left px-3 py-2.5 hover:bg-accent transition-colors flex gap-3 items-start",
        !notification.is_read && "bg-accent/50"
      )}
      onClick={() => {
        if (!notification.is_read) onRead(notification.id);
      }}
    >
      <Icon
        className={cn(
          "h-4 w-4 mt-0.5 shrink-0",
          notification.type === "error" && "text-destructive",
          notification.type === "warning" && "text-yellow-500",
          notification.type === "success" && "text-green-500",
          notification.type === "reminder" && "text-blue-500"
        )}
      />
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm truncate",
            !notification.is_read && "font-semibold"
          )}
        >
          {notification.title}
        </p>
        {notification.message && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {notification.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">{relativeTime}</p>
      </div>
    </button>
  );
}
