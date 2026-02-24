"use client";

import { useEffect, useState } from "react";
import type { LeadStage, StageNote } from "@/lib/types/leads";
import { getStageNotes, saveStageNote } from "@/lib/actions/stage-notes-actions";
import { getStageConfig } from "@/lib/constants/pipeline-stages";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  leadId: string;
  currentStage: LeadStage;
}

export function LeadStageNotesPanel({ leadId, currentStage }: Props) {
  const [notes, setNotes] = useState<StageNote[]>([]);
  const [note, setNote] = useState("");
  const [result, setResult] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const stageConfig = getStageConfig(currentStage);

  useEffect(() => {
    let ignore = false;
    async function fetchNotes() {
      setLoading(true);
      const res = await getStageNotes(leadId);
      if (ignore) return;
      if (res.data) {
        setNotes(res.data);
        const current = res.data.find((n) => n.stage === currentStage);
        if (current) {
          setNote(current.note ?? "");
          setResult(current.result ?? "");
          setNextSteps(current.next_steps ?? "");
        } else {
          setNote("");
          setResult("");
          setNextSteps("");
        }
      }
      setLoading(false);
    }
    fetchNotes();
    return () => { ignore = true; };
  }, [leadId, currentStage, refreshKey]);

  async function handleSave() {
    setSaving(true);
    const res = await saveStageNote(leadId, currentStage, {
      note: note || undefined,
      result: result || undefined,
      next_steps: nextSteps || undefined,
    });
    setSaving(false);

    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Đã lưu ghi chú");
    setRefreshKey((k) => k + 1);
  }

  const historyNotes = notes.filter((n) => n.stage !== currentStage);

  if (loading) {
    return <p className="text-sm text-muted-foreground py-4">Đang tải...</p>;
  }

  return (
    <div className="space-y-4">
      {/* Current stage badge */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Stage hiện tại:</span>
        <Badge variant="outline" className={cn(stageConfig?.color)}>
          {stageConfig?.label ?? currentStage}
        </Badge>
      </div>

      {/* Note field */}
      <div className="space-y-1.5">
        <Label htmlFor="stage-note">Ghi chú</Label>
        <Textarea
          id="stage-note"
          placeholder="Ghi chú về lead ở stage này..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
        />
      </div>

      {/* Result field */}
      <div className="space-y-1.5">
        <Label htmlFor="stage-result">Kết quả</Label>
        <Textarea
          id="stage-result"
          placeholder="Kết quả tư vấn / liên hệ..."
          value={result}
          onChange={(e) => setResult(e.target.value)}
          rows={2}
        />
      </div>

      {/* Next steps field */}
      <div className="space-y-1.5">
        <Label htmlFor="stage-next-steps">Bước tiếp theo</Label>
        <Textarea
          id="stage-next-steps"
          placeholder="Kế hoạch tiếp theo..."
          value={nextSteps}
          onChange={(e) => setNextSteps(e.target.value)}
          rows={2}
        />
      </div>

      {/* Save button */}
      <Button onClick={handleSave} disabled={saving} size="sm">
        {saving ? "Đang lưu..." : "Lưu ghi chú"}
      </Button>

      {/* History section */}
      {historyNotes.length > 0 && (
        <div className="border-t pt-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? "Ẩn" : "Xem"} lịch sử ghi chú ({historyNotes.length})
          </Button>

          {showHistory && (
            <div className="mt-2 space-y-3">
              {historyNotes.map((n) => {
                const cfg = getStageConfig(n.stage);
                return (
                  <div
                    key={n.id}
                    className="rounded-md border p-3 text-sm space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={cn(cfg?.color, "text-xs")}>
                        {cfg?.label ?? n.stage}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(n.created_at).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                    {n.note && (
                      <p className="whitespace-pre-wrap">
                        <span className="font-medium">Ghi chú:</span> {n.note}
                      </p>
                    )}
                    {n.result && (
                      <p className="whitespace-pre-wrap">
                        <span className="font-medium">Kết quả:</span> {n.result}
                      </p>
                    )}
                    {n.next_steps && (
                      <p className="whitespace-pre-wrap">
                        <span className="font-medium">Bước tiếp:</span> {n.next_steps}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
