"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { changeStudentStatus } from "@/lib/actions/student-actions";
import { getValidTransitions, NEEDS_REASON_STATUSES } from "@/lib/constants/student-statuses";
import type { StudentStatus } from "@/lib/types/users";
import { toast } from "sonner";

interface Props {
  studentId: string;
  currentStatus: StudentStatus;
  onStatusChanged: () => void;
}

export function StudentStatusTransition({ studentId, currentStatus, onStatusChanged }: Props) {
  const [selectedStatus, setSelectedStatus] = useState<StudentStatus | "">("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const options = getValidTransitions(currentStatus);

  if (options.length === 0) {
    return <p className="text-sm text-muted-foreground">Không có chuyển đổi khả dụng</p>;
  }

  const needsReason = !!selectedStatus && NEEDS_REASON_STATUSES.includes(selectedStatus);

  async function handleSubmit() {
    if (!selectedStatus) return;
    setLoading(true);
    try {
      const result = await changeStudentStatus(studentId, selectedStatus, reason || undefined);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Đã cập nhật trạng thái");
      setSelectedStatus("");
      setReason("");
      onStatusChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi cập nhật");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <Label>Chuyển trạng thái</Label>
        <Select
          value={selectedStatus}
          onValueChange={(v) => setSelectedStatus(v as StudentStatus)}
        >
          <SelectTrigger className="w-full mt-1">
            <SelectValue placeholder="Chọn trạng thái mới" />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {needsReason && (
        <div>
          <Label>Lý do</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Nhập lý do..."
            className="mt-1"
          />
        </div>
      )}
      {selectedStatus && (
        <Button onClick={handleSubmit} disabled={loading || !!(needsReason && !reason.trim())}>
          {loading ? "Đang xử lý..." : "Xác nhận"}
        </Button>
      )}
    </div>
  );
}
