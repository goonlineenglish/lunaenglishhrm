"use client";

import { useState } from "react";
import { createScheduledActivity } from "@/lib/actions/scheduled-activity-actions";
import type { LeadActivityType, RecurrencePattern } from "@/lib/types/leads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus } from "lucide-react";

const ACTIVITY_TYPES: { value: LeadActivityType; label: string }[] = [
  { value: "scheduled_call", label: "Gọi điện" },
  { value: "trial_class", label: "Học thử" },
  { value: "consultation", label: "Tư vấn" },
  { value: "meeting", label: "Gặp mặt" },
  { value: "call", label: "Follow-up" },
  { value: "note", label: "Ghi chú" },
];

const DAY_OPTIONS = [
  { value: "1", label: "Thứ 2" },
  { value: "2", label: "Thứ 3" },
  { value: "3", label: "Thứ 4" },
  { value: "4", label: "Thứ 5" },
  { value: "5", label: "Thứ 6" },
  { value: "6", label: "Thứ 7" },
  { value: "0", label: "Chủ nhật" },
];

interface AddScheduledActivityDialogProps {
  leadId: string;
  onActivityAdded: () => void;
  triggerVariant?: "icon" | "button";
}

export function AddScheduledActivityDialog({
  leadId,
  onActivityAdded,
  triggerVariant = "button",
}: AddScheduledActivityDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<LeadActivityType>("scheduled_call");
  const [scheduleFrom, setScheduleFrom] = useState("");
  const [scheduleTo, setScheduleTo] = useState("");
  const [location, setLocation] = useState("");
  const [recurrence, setRecurrence] = useState<RecurrencePattern>("once");
  const [dayOfWeek, setDayOfWeek] = useState("1");

  function resetForm() {
    setTitle("");
    setDescription("");
    setType("scheduled_call");
    setScheduleFrom("");
    setScheduleTo("");
    setLocation("");
    setRecurrence("once");
    setDayOfWeek("1");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Vui lòng nhập tiêu đề");
      return;
    }
    if (!scheduleFrom || !scheduleTo) {
      toast.error("Vui lòng chọn thời gian");
      return;
    }

    setLoading(true);
    const result = await createScheduledActivity(leadId, {
      title,
      description: description || undefined,
      type,
      scheduleFrom,
      scheduleTo,
      location: location || undefined,
      recurrencePattern: recurrence,
      recurrenceDayOfWeek: recurrence === "weekly" ? Number(dayOfWeek) : undefined,
    });
    setLoading(false);

    if (!result.success) {
      toast.error(result.error ?? "Lỗi không xác định");
      return;
    }

    toast.success("Đã tạo hoạt động");
    resetForm();
    setOpen(false);
    onActivityAdded();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerVariant === "icon" ? (
          <Button variant="ghost" size="icon" className="size-7" title="Thêm hoạt động">
            <Plus className="size-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Plus className="mr-1 size-4" />
            Thêm hoạt động
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Thêm hoạt động mới</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="act-title">Tiêu đề *</Label>
            <Input id="act-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Gọi tư vấn phụ huynh" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="act-type">Loại hoạt động</Label>
            <Select value={type} onValueChange={(v) => setType(v as LeadActivityType)}>
              <SelectTrigger id="act-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="act-from">Từ (giờ VN) *</Label>
              <Input id="act-from" type="datetime-local" value={scheduleFrom} onChange={(e) => setScheduleFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="act-to">Đến (giờ VN) *</Label>
              <Input id="act-to" type="datetime-local" value={scheduleTo} onChange={(e) => setScheduleTo(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="act-location">Địa điểm</Label>
            <Input id="act-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="VD: Phòng học 2A" />
          </div>
          <div className="space-y-2">
            <Label>Lặp lại</Label>
            <Select value={recurrence} onValueChange={(v) => setRecurrence(v as RecurrencePattern)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="once">Một lần</SelectItem>
                <SelectItem value="weekly">Hàng tuần</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {recurrence === "weekly" && (
            <div className="space-y-2">
              <Label>Ngày trong tuần</Label>
              <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAY_OPTIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="act-desc">Ghi chú</Label>
            <Textarea id="act-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Thêm ghi chú..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
            <Button type="submit" disabled={loading}>{loading ? "Đang lưu..." : "Tạo hoạt động"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
