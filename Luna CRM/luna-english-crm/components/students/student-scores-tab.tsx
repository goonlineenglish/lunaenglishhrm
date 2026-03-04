"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { StudentScore, HomeworkRecord } from "@/lib/types/student-hub-types";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface Props {
  studentId: string;
}

export function StudentScoresTab({ studentId }: Props) {
  const [scores, setScores] = useState<StudentScore[]>([]);
  const [homework, setHomework] = useState<HomeworkRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = createClient();
    Promise.all([
      sb.from("student_scores").select("*").eq("student_id", studentId).order("test_date", { ascending: false }).limit(50),
      sb.from("homework_records").select("*").eq("student_id", studentId).order("due_date", { ascending: false }).limit(50),
    ]).then(([s, h]) => {
      setScores((s.data ?? []) as StudentScore[]);
      setHomework((h.data ?? []) as HomeworkRecord[]);
      setLoading(false);
    });
  }, [studentId]);

  if (loading) return <p className="text-sm text-muted-foreground py-4">Đang tải...</p>;

  const isEmpty = scores.length === 0 && homework.length === 0;
  if (isEmpty) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Chưa có dữ liệu — Dữ liệu sẽ được đồng bộ tự động
      </p>
    );
  }

  return (
    <div className="space-y-6 py-2">
      {scores.length > 0 && (
        <section className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Điểm số</p>
          {scores.map((s) => (
            <div key={s.id} className="flex items-center justify-between text-sm">
              <span>{s.test_name}</span>
              <div className="flex items-center gap-3 text-right">
                <span className="font-medium">{s.score}/{s.max_score}</span>
                <span className="text-xs text-muted-foreground">
                  {format(parseISO(s.test_date), "dd/MM/yyyy")}
                </span>
              </div>
            </div>
          ))}
        </section>
      )}

      {homework.length > 0 && (
        <section className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bài tập</p>
          {homework.map((h) => (
            <div key={h.id} className="flex items-center justify-between text-sm">
              <span>{h.homework_name}</span>
              <div className="flex items-center gap-2">
                {h.due_date && (
                  <span className="text-xs text-muted-foreground">
                    {format(parseISO(h.due_date), "dd/MM/yyyy")}
                  </span>
                )}
                <Badge variant={h.submitted ? "default" : "secondary"} className="text-xs">
                  {h.submitted ? "Đã nộp" : "Chưa nộp"}
                </Badge>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
