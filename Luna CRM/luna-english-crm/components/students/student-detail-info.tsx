"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StudentStatusBadge } from "./student-status-badge";
import { StudentStatusTransition } from "./student-status-transition";
import { RenewalCountdown } from "./renewal-countdown";
import { updateStudent } from "@/lib/actions/student-actions";
import type { StudentWithLead } from "@/lib/actions/student-actions";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

interface Props {
  student: StudentWithLead;
  onUpdated: () => void;
}

export function StudentDetailInfo({ student, onUpdated }: Props) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    student_code: student.student_code ?? "",
    current_class: student.current_class ?? "",
    current_level: student.current_level ?? "",
    level_end_date: student.level_end_date ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateStudent(student.id, {
        student_code: formData.student_code || null,
        current_class: formData.current_class || null,
        current_level: formData.current_level || null,
        level_end_date: formData.level_end_date || null,
      });
      toast.success("Đã cập nhật thông tin");
      setEditing(false);
      onUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi cập nhật");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Trạng thái:</span>
          <StudentStatusBadge status={student.status} />
        </div>
        {!editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Sửa
          </Button>
        )}
      </div>

      <div className="space-y-3">
        <FieldRow label="Mã HS" editing={editing}>
          {editing ? (
            <Input
              value={formData.student_code}
              onChange={(e) => setFormData({ ...formData, student_code: e.target.value })}
            />
          ) : (
            <span>{student.student_code ?? "—"}</span>
          )}
        </FieldRow>
        <FieldRow label="Lớp" editing={editing}>
          {editing ? (
            <Input
              value={formData.current_class}
              onChange={(e) => setFormData({ ...formData, current_class: e.target.value })}
            />
          ) : (
            <span>{student.current_class ?? "—"}</span>
          )}
        </FieldRow>
        <FieldRow label="Trình độ" editing={editing}>
          {editing ? (
            <Input
              value={formData.current_level}
              onChange={(e) => setFormData({ ...formData, current_level: e.target.value })}
            />
          ) : (
            <span>{student.current_level ?? "—"}</span>
          )}
        </FieldRow>
        <FieldRow label="Ngày nhập học" editing={false}>
          <span>
            {student.enrollment_date
              ? format(parseISO(student.enrollment_date), "dd/MM/yyyy")
              : "—"}
          </span>
        </FieldRow>
        <FieldRow label="Hết hạn level" editing={editing}>
          {editing ? (
            <Input
              type="date"
              value={formData.level_end_date}
              onChange={(e) => setFormData({ ...formData, level_end_date: e.target.value })}
            />
          ) : (
            <div className="flex items-center gap-2">
              <span>
                {student.level_end_date
                  ? format(parseISO(student.level_end_date), "dd/MM/yyyy")
                  : "—"}
              </span>
              <RenewalCountdown levelEndDate={student.level_end_date} />
            </div>
          )}
        </FieldRow>
      </div>

      {editing && (
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu"}
          </Button>
          <Button variant="outline" onClick={() => setEditing(false)}>
            Hủy
          </Button>
        </div>
      )}

      <Separator />

      <StudentStatusTransition
        studentId={student.id}
        currentStatus={student.status}
        onStatusChanged={onUpdated}
      />
    </div>
  );
}

function FieldRow({
  label,
  children,
  editing,
}: {
  label: string;
  children: React.ReactNode;
  editing: boolean;
}) {
  return (
    <div className={editing ? "space-y-1" : "flex justify-between items-center"}>
      <Label className="text-muted-foreground">{label}</Label>
      <div>{children}</div>
    </div>
  );
}
