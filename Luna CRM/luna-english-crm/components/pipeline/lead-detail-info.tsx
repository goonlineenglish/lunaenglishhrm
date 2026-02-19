"use client";

import { useState } from "react";
import type { LeadWithAssignee } from "@/lib/hooks/use-realtime-leads";
import type { Lead, LeadSource, ProgramType } from "@/lib/types/leads";
import type { UserRole } from "@/lib/types/users";
import { updateLead } from "@/lib/actions/lead-actions";
import { AssignAdvisorSelect } from "@/components/pipeline/assign-advisor-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getStageConfig } from "@/lib/constants/pipeline-stages";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Advisor {
  id: string;
  full_name: string;
  role: string;
}

interface LeadDetailInfoProps {
  lead: LeadWithAssignee;
  advisors: Advisor[];
  userRole: UserRole;
  onLeadUpdated: (lead: Lead) => void;
}

export function LeadDetailInfo({
  lead,
  advisors,
  userRole,
  onLeadUpdated,
}: LeadDetailInfoProps) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const stageConfig = getStageConfig(lead.current_stage);

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
      program_interest:
        (formData.get("program_interest") as ProgramType) || null,
      expected_class: (formData.get("expected_class") as string) || null,
      notes: (formData.get("notes") as string) || null,
    });

    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Đã cập nhật thông tin lead");
    setEditing(false);
    if (result.data) onLeadUpdated(result.data);
  }

  if (!editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge
            className={cn(stageConfig?.color)}
            variant="outline"
          >
            {stageConfig?.label ?? lead.current_stage}
          </Badge>
          {userRole !== "marketing" && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Chỉnh sửa
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Tên phụ huynh</p>
            <p className="font-medium">{lead.parent_name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Số điện thoại</p>
            <p className="font-medium">{lead.parent_phone}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Email</p>
            <p className="font-medium">{lead.parent_email ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Địa chỉ</p>
            <p className="font-medium">{lead.parent_address ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Tên học sinh</p>
            <p className="font-medium">{lead.student_name ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Ngày sinh</p>
            <p className="font-medium">{lead.student_dob ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Nguồn</p>
            <p className="font-medium">{lead.source}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Chương trình</p>
            <p className="font-medium">{lead.program_interest ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Lớp dự kiến</p>
            <p className="font-medium">{lead.expected_class ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Tư vấn viên</p>
            <p className="font-medium">
              {lead.users?.full_name ?? "Chưa gán"}
            </p>
          </div>
        </div>

        {lead.notes && (
          <div>
            <p className="text-sm text-muted-foreground">Ghi chú</p>
            <p className="text-sm">{lead.notes}</p>
          </div>
        )}

        {lead.lost_reason && (
          <div>
            <p className="text-sm text-muted-foreground">Lý do mất</p>
            <p className="text-sm text-red-600">{lead.lost_reason}</p>
          </div>
        )}

        {userRole === "admin" && (
          <div className="border-t pt-4">
            <Label className="mb-2 block text-sm">Phân công tư vấn viên</Label>
            <AssignAdvisorSelect
              leadId={lead.id}
              currentAdvisorId={lead.assigned_to}
              advisors={advisors}
              onAssigned={onLeadUpdated}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="edit_parent_name">Tên phụ huynh</Label>
        <Input
          id="edit_parent_name"
          name="parent_name"
          defaultValue={lead.parent_name}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit_parent_phone">Số điện thoại</Label>
        <Input
          id="edit_parent_phone"
          name="parent_phone"
          defaultValue={lead.parent_phone}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit_parent_email">Email</Label>
        <Input
          id="edit_parent_email"
          name="parent_email"
          type="email"
          defaultValue={lead.parent_email ?? ""}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit_parent_address">Địa chỉ</Label>
        <Input
          id="edit_parent_address"
          name="parent_address"
          defaultValue={lead.parent_address ?? ""}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit_student_name">Tên học sinh</Label>
        <Input
          id="edit_student_name"
          name="student_name"
          defaultValue={lead.student_name ?? ""}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit_student_dob">Ngày sinh</Label>
        <Input
          id="edit_student_dob"
          name="student_dob"
          type="date"
          defaultValue={lead.student_dob ?? ""}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Nguồn</Label>
        <Select name="source" defaultValue={lead.source}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
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
        <Select
          name="program_interest"
          defaultValue={lead.program_interest ?? ""}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Chọn chương trình" />
          </SelectTrigger>
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
        <Input
          id="edit_expected_class"
          name="expected_class"
          defaultValue={lead.expected_class ?? ""}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit_notes">Ghi chú</Label>
        <Textarea
          id="edit_notes"
          name="notes"
          defaultValue={lead.notes ?? ""}
          rows={3}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Đang lưu..." : "Lưu"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setEditing(false)}
        >
          Hủy
        </Button>
      </div>
    </form>
  );
}
