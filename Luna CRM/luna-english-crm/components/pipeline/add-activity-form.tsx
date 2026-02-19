"use client";

import { useState } from "react";
import { createActivity } from "@/lib/actions/activity-actions";
import type { LeadActivityType } from "@/lib/types/leads";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface AddActivityFormProps {
  leadId: string;
  onActivityAdded: () => void;
}

export function AddActivityForm({
  leadId,
  onActivityAdded,
}: AddActivityFormProps) {
  const [type, setType] = useState<LeadActivityType>("call");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!content.trim()) {
      toast.error("Vui lòng nhập nội dung");
      return;
    }

    setLoading(true);
    const result = await createActivity(leadId, type, content);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Đã thêm hoạt động");
    setContent("");
    onActivityAdded();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Select
        value={type}
        onValueChange={(v) => setType(v as LeadActivityType)}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="call">Gọi điện</SelectItem>
          <SelectItem value="message">Nhắn tin</SelectItem>
          <SelectItem value="meeting">Gặp mặt</SelectItem>
          <SelectItem value="note">Ghi chú</SelectItem>
        </SelectContent>
      </Select>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Nhập nội dung hoạt động..."
        rows={2}
      />
      <Button type="submit" size="sm" disabled={loading}>
        {loading ? "Đang lưu..." : "Thêm hoạt động"}
      </Button>
    </form>
  );
}
