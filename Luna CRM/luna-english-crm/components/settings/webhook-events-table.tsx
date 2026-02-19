"use client";

import { Fragment, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface WebhookEventsTableProps {
  events: Array<Record<string, unknown>>;
  loading: boolean;
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "processed"
      ? "default"
      : status === "failed"
        ? "destructive"
        : "secondary";

  const label =
    status === "processed"
      ? "Thành công"
      : status === "failed"
        ? "Thất bại"
        : "Đã nhận";

  return <Badge variant={variant}>{label}</Badge>;
}

export function WebhookEventsTable({
  events,
  loading,
}: WebhookEventsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lịch sử Webhook</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lịch sử Webhook</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Chưa có sự kiện webhook nào
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead>Nguồn</TableHead>
                <TableHead>Loại sự kiện</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => {
                const id = event.id as string;
                const isExpanded = expandedId === id;

                return (
                  <Fragment key={id}>
                    <TableRow>
                      <TableCell className="text-sm">
                        {new Date(
                          event.created_at as string
                        ).toLocaleString("vi-VN")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {(event.provider as string) === "zalo"
                            ? "Zalo"
                            : "Facebook"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {event.event_type as string}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={event.status as string} />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setExpandedId(isExpanded ? null : id)
                          }
                        >
                          {isExpanded ? "Thu gọn" : "Chi tiết"}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={`${id}-detail`}>
                        <TableCell colSpan={5}>
                          <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-48">
                            {JSON.stringify(event.payload, null, 2)}
                          </pre>
                          {typeof event.error_message === "string" && (
                            <p className="text-xs text-destructive mt-2">
                              Lỗi: {event.error_message}
                            </p>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
