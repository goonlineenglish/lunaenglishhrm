"use client";

import { useEffect, useState, useCallback } from "react";
import { getStageConfigs, updateStageNextStepsConfig } from "@/lib/actions/checklist-actions";
import type { StageNextStepConfig, StageNextStep, LeadStage } from "@/lib/types/leads";
import { PIPELINE_STAGES } from "@/lib/constants/pipeline-stages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";

export function StageConfigSettings() {
  const [configs, setConfigs] = useState<StageNextStepConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStage, setEditingStage] = useState<LeadStage | null>(null);
  const [editSteps, setEditSteps] = useState<StageNextStep[]>([]);
  const [saving, setSaving] = useState(false);

  const loadConfigs = useCallback(async () => {
    setLoading(true);
    const result = await getStageConfigs();
    if (result.data) setConfigs(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  function handleEdit(config: StageNextStepConfig) {
    setEditingStage(config.stage);
    setEditSteps([...config.steps].sort((a, b) => a.order - b.order));
  }

  function handleAddStep() {
    const maxId = editSteps.reduce(
      (max, s) => Math.max(max, parseInt(s.id, 10) || 0),
      0
    );
    setEditSteps([
      ...editSteps,
      { id: String(maxId + 1), label: "", order: editSteps.length + 1 },
    ]);
  }

  function handleRemoveStep(stepId: string) {
    setEditSteps(
      editSteps
        .filter((s) => s.id !== stepId)
        .map((s, i) => ({ ...s, order: i + 1 }))
    );
  }

  function handleStepLabelChange(stepId: string, label: string) {
    setEditSteps(editSteps.map((s) => (s.id === stepId ? { ...s, label } : s)));
  }

  async function handleSave() {
    if (!editingStage) return;
    const validSteps = editSteps.filter((s) => s.label.trim());
    if (validSteps.length === 0) {
      toast.error("Cần ít nhất 1 bước");
      return;
    }

    setSaving(true);
    const result = await updateStageNextStepsConfig(editingStage, validSteps);
    setSaving(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Đã lưu cấu hình");
    setEditingStage(null);
    loadConfigs();
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Cấu hình bước tiếp theo</CardTitle>
        <p className="text-sm text-muted-foreground">
          Thiết lập checklist mặc định cho mỗi giai đoạn pipeline
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {PIPELINE_STAGES.map((stage) => {
          const config = configs.find((c) => c.stage === stage.id);
          const steps = config?.steps ?? [];
          const isEditing = editingStage === stage.id;

          return (
            <div key={stage.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{stage.label}</span>
                {!isEditing ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      config && handleEdit(config)
                    }
                  >
                    Chỉnh sửa
                  </Button>
                ) : (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingStage(null)}
                    >
                      Hủy
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      <Save className="size-3 mr-1" />
                      Lưu
                    </Button>
                  </div>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  {editSteps.map((step) => (
                    <div key={step.id} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-5">
                        {step.order}.
                      </span>
                      <Input
                        value={step.label}
                        onChange={(e) =>
                          handleStepLabelChange(step.id, e.target.value)
                        }
                        placeholder="Tên bước..."
                        className="h-8 text-sm"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-red-500"
                        onClick={() => handleRemoveStep(step.id)}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleAddStep}
                  >
                    <Plus className="size-3 mr-1" />
                    Thêm bước
                  </Button>
                </div>
              ) : (
                <ul className="space-y-1">
                  {steps
                    .sort((a, b) => a.order - b.order)
                    .map((step) => (
                      <li key={step.id} className="text-sm text-muted-foreground">
                        {step.order}. {step.label}
                      </li>
                    ))}
                  {steps.length === 0 && (
                    <li className="text-sm text-muted-foreground italic">
                      Chưa có bước nào
                    </li>
                  )}
                </ul>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
