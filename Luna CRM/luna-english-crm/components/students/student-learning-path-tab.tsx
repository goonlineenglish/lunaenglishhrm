"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getLearningPath, upsertLearningPath } from "@/lib/actions/student-learning-actions";
import { PROGRAM_CONFIGS, PROGRAM_TYPE_OPTIONS } from "@/lib/constants/student-hub-constants";
import type { LearningPath, LearningMilestone } from "@/lib/types/student-hub-types";
import { format, parseISO } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Props {
  studentId: string;
}

interface PathWithMilestones extends LearningPath {
  milestones: LearningMilestone[];
}

export function StudentLearningPathTab({ studentId }: Props) {
  const [path, setPath] = useState<PathWithMilestones | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupMode, setSetupMode] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getLearningPath(studentId).then(({ data }) => {
      setPath(data);
      setLoading(false);
    });
  }, [studentId]);

  async function handleSetup() {
    if (!selectedProgram) return;
    setSaving(true);
    const result = await upsertLearningPath(studentId, { program_type: selectedProgram, current_session: 0 });
    if (result.error) {
      toast.error(result.error);
    } else {
      const { data: refreshed } = await getLearningPath(studentId);
      setPath(refreshed);
      setSetupMode(false);
      toast.success("Đã thiết lập lộ trình học");
    }
    setSaving(false);
  }

  if (loading) return <p className="text-sm text-muted-foreground py-4">Đang tải...</p>;

  if (!path) {
    return (
      <div className="space-y-4 py-2">
        <p className="text-sm text-muted-foreground">
          Chưa có lộ trình học — Thêm từ trang hồ sơ
        </p>
        {setupMode ? (
          <div className="space-y-3">
            <Select value={selectedProgram} onValueChange={setSelectedProgram}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn chương trình..." />
              </SelectTrigger>
              <SelectContent>
                {PROGRAM_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button size="sm" disabled={!selectedProgram || saving} onClick={handleSetup}>
                {saving ? "Đang lưu..." : "Lưu"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSetupMode(false)}>Hủy</Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setSetupMode(true)}>
            Thiết lập lộ trình
          </Button>
        )}
      </div>
    );
  }

  const config = PROGRAM_CONFIGS[path.program_type as keyof typeof PROGRAM_CONFIGS];
  const totalSessions = (config?.totalLevels ?? 1) * (config?.sessionsPerLevel ?? 1);
  const progressPct = totalSessions > 0 ? Math.min(100, (path.current_session / totalSessions) * 100) : 0;

  return (
    <div className="space-y-5 py-2">
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{config?.label ?? path.program_type}</p>
          <Badge variant="outline" className="text-xs">
            Level {path.current_level ?? "—"}
          </Badge>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Buổi học: {path.current_session} / {totalSessions}</span>
          <span>{progressPct.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary rounded-full h-2 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {path.started_at && (
        <p className="text-xs text-muted-foreground">
          Bắt đầu: {format(parseISO(path.started_at), "dd/MM/yyyy")}
        </p>
      )}

      {path.milestones.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mốc đã đạt</p>
          {path.milestones.map((m) => (
            <div key={m.id} className="flex items-center justify-between text-sm">
              <span>{m.milestone_name}</span>
              {m.achieved_at && (
                <span className="text-xs text-muted-foreground">
                  {format(parseISO(m.achieved_at), "dd/MM/yyyy")}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
