"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createStudent } from "@/lib/actions/student-actions";
import { createClient } from "@/lib/supabase/client";
import type { Lead } from "@/lib/types/leads";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateStudentDialog({ open, onClose, onCreated }: Props) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    lead_id: "",
    student_code: "",
    current_class: "",
    current_level: "",
    enrollment_date: new Date().toISOString().split("T")[0],
    level_end_date: "",
  });

  useEffect(() => {
    if (!open) return;
    async function loadLeads() {
      const supabase = createClient();
      const { data } = await supabase
        .from("leads")
        .select("*")
        .eq("current_stage", "da_dang_ky")
        .order("created_at", { ascending: false });
      setLeads(data ?? []);
    }
    loadLeads();
  }, [open]);

  function resetForm() {
    setForm({
      lead_id: "",
      student_code: "",
      current_class: "",
      current_level: "",
      enrollment_date: new Date().toISOString().split("T")[0],
      level_end_date: "",
    });
  }

  async function handleSubmit() {
    if (!form.current_class || !form.current_level || !form.enrollment_date) {
      toast.error("Vui lòng điền các trường bắt buộc");
      return;
    }
    setLoading(true);
    try {
      await createStudent({
        lead_id: form.lead_id || undefined,
        student_code: form.student_code || undefined,
        current_class: form.current_class,
        current_level: form.current_level,
        enrollment_date: form.enrollment_date,
        level_end_date: form.level_end_date || undefined,
      });
      toast.success("Đã tạo học sinh mới");
      resetForm();
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi tạo học sinh");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Thêm học sinh mới</DialogTitle>
          <DialogDescription>Tạo học sinh thủ công hoặc liên kết từ lead</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Lead liên kết</Label>
            <Select value={form.lead_id} onValueChange={(v) => setForm({ ...form, lead_id: v })}>
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder="Chọn lead (tuỳ chọn)" />
              </SelectTrigger>
              <SelectContent>
                {leads.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {lead.student_name ?? lead.parent_name} - {lead.parent_phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Mã học sinh</Label>
            <Input
              value={form.student_code}
              onChange={(e) => setForm({ ...form, student_code: e.target.value })}
              placeholder="VD: HS001"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Lớp *</Label>
            <Input
              value={form.current_class}
              onChange={(e) => setForm({ ...form, current_class: e.target.value })}
              placeholder="VD: Buttercup A1"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Trình độ *</Label>
            <Input
              value={form.current_level}
              onChange={(e) => setForm({ ...form, current_level: e.target.value })}
              placeholder="VD: Beginner"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Ngày nhập học *</Label>
            <Input
              type="date"
              value={form.enrollment_date}
              onChange={(e) => setForm({ ...form, enrollment_date: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Ngày hết hạn level</Label>
            <Input
              type="date"
              value={form.level_end_date}
              onChange={(e) => setForm({ ...form, level_end_date: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Đang tạo..." : "Tạo học sinh"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
