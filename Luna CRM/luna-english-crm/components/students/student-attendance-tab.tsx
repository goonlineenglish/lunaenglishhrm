"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AttendanceRecord } from "@/lib/types/student-hub-types";
import { ATTENDANCE_STATUS_LABELS } from "@/lib/constants/student-hub-constants";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface Props {
  studentId: string;
}

const STATUS_COLORS: Record<string, string> = {
  present: "bg-green-100 text-green-800",
  absent: "bg-red-100 text-red-800",
  late: "bg-yellow-100 text-yellow-800",
  excused: "bg-blue-100 text-blue-800",
};

export function StudentAttendanceTab({ studentId }: Props) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = createClient();
    sb.from("attendance_records")
      .select("*")
      .eq("student_id", studentId)
      .order("class_date", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setRecords((data ?? []) as AttendanceRecord[]);
        setLoading(false);
      });
  }, [studentId]);

  if (loading) return <p className="text-sm text-muted-foreground py-4">Đang tải...</p>;

  if (records.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Chưa có dữ liệu điểm danh — Dữ liệu sẽ được đồng bộ tự động
      </p>
    );
  }

  const total = records.length;
  const present = records.filter((r) => r.status === "present" || r.status === "late").length;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <div className="space-y-4 py-2">
      <p className="text-xs text-muted-foreground">
        Có mặt: {pct}% ({present}/{total} buổi)
      </p>
      <div className="space-y-2">
        {records.map((r) => (
          <div key={r.id} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {format(parseISO(r.class_date), "dd/MM/yyyy")}
            </span>
            <div className="flex items-center gap-2">
              {r.note && <span className="text-xs text-muted-foreground">{r.note}</span>}
              <Badge className={STATUS_COLORS[r.status] ?? ""} variant="outline">
                {ATTENDANCE_STATUS_LABELS[r.status] ?? r.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
