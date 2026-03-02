"use client";

import { useState } from "react";
import type { LeadWithAssignee } from "@/lib/hooks/use-realtime-leads";
import type { Lead, LeadSource, ProgramType } from "@/lib/types/leads";
import { updateLead } from "@/lib/actions/lead-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface LeadDetailEditFormProps {
  lead: LeadWithAssignee;
  onLeadUpdated: (lead: Lead) => void;
  onCancel: () => void;
}

export function LeadDetailEditForm({ lead, onLeadUpdated, onCancel }: LeadDetailEditFormProps) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await updateLead(lead.id, {
      parent_name: formData.get("parent_name") as string,
      parent_phone: formData.get("parent_phone") as string,
      parent_email: (formData.get("parent_email") as string) || null,
      parent_address: (formData.get("parent_address") as string) || null,
      student_name: (formData.get("student_name") as string) || null,
      student_dob: (formData.get("student_dob") as string) || null,
      source: formData.get("source") as LeadSource,
      program_interest: (formData.get("program_interest") as ProgramType) || null,
      expected_class: (formData.get("expected_class") as string) || null,
      notes: (formData.get("notes") as string) || null,
    });

    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Đã cập nhật thông tin lead");
    if (result.data) onLeadUpdated(result.data);
    onCancel();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="edit_parent_name">Tên phụ huynh</Label>
        <Input id="edit_parent_name" name="parent_name" defaultValue={lead.parent_name} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit_parent_phone">Số điện thoại</Label>
        <Input id="edit_parent_phone" name="parent_phone" defaultValue={lead.parent_phone} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit_parent_email">Email</Label>
        <Input id="edit_parent_email" name="parent_email" type="email" defaultValue={lead.parent_email ?? ""} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit_parent_address">Địa chỉ</Label>
        <Input id="edit_parent_address" name="parent_address" defaultValue={lead.parent_address ?? ""} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit_student_name">Tên học sinh</Label>
        <Input id="edit_student_name" name="student_name" defaultValue={lead.student_name ?? ""} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit_student_dob">Ngày sinh</Label>
        <Input id="edit_student_dob" name="student_dob" type="date" defaultValue={lead.student_dob ?? ""} />
      </div>
      <div className="space-y-1.5">
        <Label>Nguồn</Label>
        <Select name="source" defaultValue={lead.source}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="facebook">Facebook</SelectItem>
            <SelectItem value="zalo">Zalo</SelectItem>
            <SelectItem value="walk_in">Walk-in</SelectItem>
            <SelectItem value="website">Website</SelectItem>
            <SelectItem value="phone">Điện thoại</SelectItem>
            <SelectItem value="referral">Giới thiệu</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Chương trình</Label>
        <Select name="program_interest" defaultValue={lead.program_interest ?? ""}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Chọn chương trình" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="buttercup">Buttercup</SelectItem>
            <SelectItem value="primary_success">Primary Success</SelectItem>
            <SelectItem value="secondary">Secondary</SelectItem>
            <SelectItem value="ielts">IELTS</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit_expected_class">Lớp dự kiến</Label>
        <Input id="edit_expected_class" name="expected_class" defaultValue={lead.expected_class ?? ""} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit_notes">Ghi chú</Label>
        <Textarea id="edit_notes" name="notes" defaultValue={lead.notes ?? ""} rows={3} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Đang lưu..." : "Lưu"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Hủy
        </Button>
      </div>
    </form>
  );
}
