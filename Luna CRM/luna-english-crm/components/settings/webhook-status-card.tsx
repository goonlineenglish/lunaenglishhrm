"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface WebhookStatusCardProps {
  provider: "zalo" | "facebook";
  events: Array<Record<string, unknown>>;
}

export function WebhookStatusCard({
  provider,
  events,
}: WebhookStatusCardProps) {
  const providerLabel = provider === "zalo" ? "Zalo OA" : "Facebook";

  // Calculate stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString();

  const eventsToday = events.filter(
    (e) => (e.created_at as string) >= todayStr
  );
  const errors = events.filter((e) => e.status === "failed");
  const lastEvent = events[0]; // Already sorted by created_at DESC

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          Webhook {providerLabel}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Sự kiện hôm nay
          </span>
          <Badge variant="secondary">{eventsToday.length}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Lỗi gần đây</span>
          <Badge variant={errors.length > 0 ? "destructive" : "secondary"}>
            {errors.length}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Sự kiện cuối</span>
          <span className="text-sm">
            {lastEvent
              ? new Date(lastEvent.created_at as string).toLocaleString(
                  "vi-VN"
                )
              : "Chưa có"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
