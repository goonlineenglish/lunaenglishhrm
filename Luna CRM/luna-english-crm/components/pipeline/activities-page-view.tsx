"use client";

import { useEffect, useState, useCallback } from "react";
import { getUpcomingActivities } from "@/lib/actions/scheduled-activity-actions";
import { updateActivityStatus } from "@/lib/actions/scheduled-activity-actions";
import type { LeadActivity } from "@/lib/types/leads";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { toZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import { Check, X } from "lucide-react";

const VN_TZ = "Asia/Ho_Chi_Minh";

const TYPE_LABELS: Record<string, string> = {
  scheduled_call: "Cuộc gọi",
  trial_class: "Học thử",
  consultation: "Tư vấn",
  meeting: "Gặp mặt",
  call: "Follow-up",
  note: "Ghi chú",
};

function formatVnDate(utcStr: string): string {
  return format(toZonedTime(new Date(utcStr), VN_TZ), "dd/MM/yyyy HH:mm");
}

function statusBadge(status: string, scheduleTo: string | null) {
  if (status === "completed")
    return <Badge className="bg-green-100 text-green-700">Đã xong</Badge>;
  if (status === "cancelled")
    return <Badge variant="secondary">Đã hủy</Badge>;
  if (scheduleTo && new Date(scheduleTo) < new Date())
    return <Badge className="bg-red-100 text-red-700">Quá hạn</Badge>;
  return <Badge className="bg-yellow-100 text-yellow-700">Sắp tới</Badge>;
}

type ActivityWithLead = LeadActivity & { lead_name?: string };

export function ActivitiesPageView() {
  const [activities, setActivities] = useState<ActivityWithLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("pending");

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getUpcomingActivities({
      type: typeFilter === "all" ? undefined : typeFilter,
      status: statusFilter === "all" ? undefined : statusFilter,
    });
    if (result.data) setActivities(result.data);
    setLoading(false);
  }, [typeFilter, statusFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on filter change
    load();
  }, [load]);

  async function handleStatus(id: string, status: "completed" | "cancelled") {
    const result = await updateActivityStatus(id, status);
    if (!result.success) {
      toast.error(result.error ?? "Lỗi");
      return;
    }
    toast.success(status === "completed" ? "Đã hoàn thành" : "Đã hủy");
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Loại" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại</SelectItem>
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="pending">Sắp tới</SelectItem>
            <SelectItem value="completed">Đã xong</SelectItem>
            <SelectItem value="cancelled">Đã hủy</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Không có hoạt động nào
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ngày</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Tiêu đề</TableHead>
                <TableHead>Học sinh</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-sm whitespace-nowrap">
                    {a.schedule_from ? formatVnDate(a.schedule_from) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {TYPE_LABELS[a.type] ?? a.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{a.title ?? a.content ?? "—"}</TableCell>
                  <TableCell className="text-sm">{a.lead_name ?? "—"}</TableCell>
                  <TableCell>{statusBadge(a.status, a.schedule_to)}</TableCell>
                  <TableCell>
                    {a.status === "pending" && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-green-600"
                          title="Hoàn thành"
                          onClick={() => handleStatus(a.id, "completed")}
                        >
                          <Check className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-red-500"
                          title="Hủy"
                          onClick={() => handleStatus(a.id, "cancelled")}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
