"use client";

import { useState } from "react";
import type { LeadStage } from "@/lib/types/leads";
import { PIPELINE_STAGES } from "@/lib/constants/pipeline-stages";
import { bulkUpdateLeadStage, deleteLead } from "@/lib/actions/lead-actions";
import { StatusChangeConfirmationDialog } from "@/components/shared/status-change-confirmation-dialog";
import { DeleteConfirmationDialog } from "@/components/shared/delete-confirmation-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeadBulkActionBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
  onDone: () => void;
}

export function LeadBulkActionBar({ selectedIds, onClearSelection, onDone }: LeadBulkActionBarProps) {
  const [selectedStage, setSelectedStage] = useState<LeadStage | "">("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleApply(reason?: string) {
    if (!selectedStage) return;
    setLoading(true);
    try {
      const result = await bulkUpdateLeadStage(selectedIds, selectedStage, reason);
      const total = selectedIds.length;
      const ok = result.succeeded.length;
      const fail = result.failed.length;

      if (fail === 0) {
        toast.success(`${ok}/${total} thành công`);
      } else {
        toast.warning(`${ok}/${total} thành công, ${fail} thất bại`);
      }
      setSelectedStage("");
      onDone();
    } catch {
      toast.error("Lỗi cập nhật hàng loạt");
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  }

  function handleSubmit() {
    if (!selectedStage) return;
    if (selectedStage === "mat_lead") {
      setConfirmOpen(true);
    } else {
      handleApply();
    }
  }

  async function handleBulkDelete() {
    setLoading(true);
    let ok = 0;
    let fail = 0;
    for (const id of selectedIds) {
      const result = await deleteLead(id);
      if (result.error) fail++;
      else ok++;
    }
    setLoading(false);
    setDeleteOpen(false);
    if (fail === 0) {
      toast.success(`Đã xóa ${ok} lead`);
    } else {
      toast.warning(`${ok} thành công, ${fail} thất bại`);
    }
    onDone();
  }

  if (selectedIds.length === 0) return null;

  return (
    <>
      <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border bg-white px-4 py-3 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">
            Đã chọn {selectedIds.length} lead
          </span>
          <Select value={selectedStage} onValueChange={(v) => setSelectedStage(v as LeadStage)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Chọn trạng thái" />
            </SelectTrigger>
            <SelectContent>
              {PIPELINE_STAGES.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  <span className="flex items-center gap-2">
                    <span className={cn("inline-block size-2 rounded-full", stage.bgColor.split(" ")[0])} />
                    {stage.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" disabled={!selectedStage || loading} onClick={handleSubmit}>
            {loading ? "Đang xử lý..." : "Áp dụng"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            disabled={loading}
            onClick={() => setDeleteOpen(true)}
            title="Xóa hàng loạt"
          >
            <Trash2 className="mr-1 size-4" />
            Xóa
          </Button>
          <Button size="sm" variant="ghost" onClick={onClearSelection}>
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <StatusChangeConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Xác nhận mất lead hàng loạt"
        description={`Bạn có chắc muốn đánh dấu ${selectedIds.length} lead là mất?`}
        requireReason
        loading={loading}
        onConfirm={(reason) => handleApply(reason)}
      />

      <DeleteConfirmationDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Xóa lead hàng loạt"
        description={`Bạn có chắc muốn xóa ${selectedIds.length} lead? Dữ liệu sẽ được chuyển vào thùng rác.`}
        onConfirm={handleBulkDelete}
        loading={loading}
      />
    </>
  );
}
