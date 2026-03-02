"use client";

import { useState } from "react";
import type { StudentStatus } from "@/lib/types/users";
import {
  STUDENT_STATUSES,
  NEEDS_REASON_STATUSES,
} from "@/lib/constants/student-statuses";
import { bulkChangeStudentStatus } from "@/lib/actions/student-actions";
import { StatusChangeConfirmationDialog } from "@/components/shared/status-change-confirmation-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface StudentBulkActionBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
  onDone: () => void;
}

export function StudentBulkActionBar({
  selectedIds,
  onClearSelection,
  onDone,
}: StudentBulkActionBarProps) {
  const [selectedStatus, setSelectedStatus] = useState<StudentStatus | "">("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const needsReason =
    !!selectedStatus && NEEDS_REASON_STATUSES.includes(selectedStatus as StudentStatus);

  async function handleApply(reason?: string) {
    if (!selectedStatus) return;
    setLoading(true);
    try {
      const result = await bulkChangeStudentStatus(
        selectedIds,
        selectedStatus as StudentStatus,
        reason
      );
      const total = selectedIds.length;
      const ok = result.succeeded.length;
      const fail = result.failed.length;

      if (fail === 0) {
        toast.success(`${ok}/${total} thành công`);
      } else {
        toast.warning(`${ok}/${total} thành công, ${fail} thất bại`);
      }
      setSelectedStatus("");
      onDone();
    } catch {
      toast.error("Lỗi cập nhật hàng loạt");
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  }

  function handleSubmit() {
    if (!selectedStatus) return;
    if (needsReason) {
      setConfirmOpen(true);
    } else {
      handleApply();
    }
  }

  if (selectedIds.length === 0) return null;

  return (
    <>
      <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border bg-white px-4 py-3 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">
            Đã chọn {selectedIds.length} học sinh
          </span>
          <Select
            value={selectedStatus}
            onValueChange={(v) => setSelectedStatus(v as StudentStatus)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Chọn trạng thái" />
            </SelectTrigger>
            <SelectContent>
              {STUDENT_STATUSES.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  <span className="flex items-center gap-2">
                    <span className={cn("inline-block size-2 rounded-full", s.dotColor)} />
                    {s.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={!selectedStatus || loading}
            onClick={handleSubmit}
          >
            {loading ? "Đang xử lý..." : "Áp dụng"}
          </Button>
          <Button size="sm" variant="ghost" onClick={onClearSelection}>
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <StatusChangeConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Xác nhận chuyển trạng thái hàng loạt`}
        description={`Vui lòng nhập lý do cho ${selectedIds.length} học sinh.`}
        requireReason
        loading={loading}
        onConfirm={(reason) => handleApply(reason)}
      />
    </>
  );
}
