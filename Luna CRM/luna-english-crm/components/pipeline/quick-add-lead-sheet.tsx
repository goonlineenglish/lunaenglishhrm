"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
import { createLead } from "@/lib/actions/lead-actions";
import type { LeadSource, ProgramType } from "@/lib/types/leads";
import { toast } from "sonner";

interface QuickAddLeadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickAddLeadSheet({
  open,
  onOpenChange,
}: QuickAddLeadSheetProps) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await createLead({
      parent_name: formData.get("parent_name") as string,
      parent_phone: formData.get("parent_phone") as string,
      source: formData.get("source") as LeadSource,
      program_interest:
        (formData.get("program_interest") as ProgramType) || null,
      student_name: (formData.get("student_name") as string) || null,
      notes: (formData.get("notes") as string) || null,
    });

    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Đã thêm lead mới");
    onOpenChange(false);
    (e.target as HTMLFormElement).reset();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Thêm lead mới</SheetTitle>
          <SheetDescription>
            Nhập thông tin phụ huynh để tạo lead
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 px-4">
          <div className="space-y-2">
            <Label htmlFor="parent_name">Tên phụ huynh *</Label>
            <Input
              id="parent_name"
              name="parent_name"
              required
              placeholder="Nguyễn Văn A"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="parent_phone">Số điện thoại *</Label>
            <Input
              id="parent_phone"
              name="parent_phone"
              required
              placeholder="0901234567"
              maxLength={10}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="source">Nguồn *</Label>
            <Select name="source" required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn nguồn" />
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

          <div className="space-y-2">
            <Label htmlFor="program_interest">Chương trình</Label>
            <Select name="program_interest">
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn chương trình" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buttercup">Buttercup</SelectItem>
                <SelectItem value="primary_success">
                  Primary Success
                </SelectItem>
                <SelectItem value="secondary">Secondary</SelectItem>
                <SelectItem value="ielts">IELTS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="student_name">Tên học sinh</Label>
            <Input
              id="student_name"
              name="student_name"
              placeholder="Nguyễn Văn B"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Ghi chú</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Ghi chú thêm..."
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Đang tạo..." : "Tạo lead"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
