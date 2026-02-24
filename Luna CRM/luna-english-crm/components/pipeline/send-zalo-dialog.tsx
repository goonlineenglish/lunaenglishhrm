"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  getZaloTemplates,
  sendZaloTemplateMessage,
} from "@/lib/actions/zalo-message-actions";
import type { ZaloMessageTemplate } from "@/lib/actions/zalo-message-actions";
import type { LeadStage } from "@/lib/types/leads";

interface SendZaloDialogProps {
  leadId: string;
  currentStage: LeadStage;
  parentName: string;
  studentName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendZaloDialog({
  leadId,
  currentStage,
  parentName,
  studentName,
  open,
  onOpenChange,
}: SendZaloDialogProps) {
  const [templates, setTemplates] = useState<ZaloMessageTemplate[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    const result = await getZaloTemplates(currentStage);
    if (result.data) {
      setTemplates(result.data);
    }
    setLoadingTemplates(false);
  }, [currentStage]);

  useEffect(() => {
    if (open) {
      loadTemplates();
      setSelectedKey("");
      setMessageBody("");
    }
  }, [open, loadTemplates]);

  // Render template with lead vars when template is selected
  function onTemplateSelect(key: string) {
    setSelectedKey(key);
    const tpl = templates.find((t) => t.template_key === key);
    if (tpl) {
      const rendered = tpl.body_text
        .replace(/\{\{parent_name\}\}/g, parentName || "")
        .replace(/\{\{student_name\}\}/g, studentName || "")
        .replace(/\{\{trial_date\}\}/g, "[ngày học thử]")
        .replace(/\{\{trial_time\}\}/g, "[giờ học thử]")
        .replace(/\{\{location\}\}/g, "Luna English Center");
      setMessageBody(rendered);
    }
  }

  async function handleSend() {
    if (!messageBody.trim()) {
      toast.error("Vui lòng nhập nội dung tin nhắn");
      return;
    }

    setSending(true);
    const result = await sendZaloTemplateMessage(
      leadId,
      selectedKey || "custom",
      messageBody.trim()
    );
    setSending(false);

    if (result.success) {
      toast.success("Đã gửi tin nhắn Zalo");
      onOpenChange(false);
    } else {
      toast.error(result.error ?? "Gửi thất bại");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gửi tin nhắn Zalo</DialogTitle>
          <DialogDescription>
            Gửi tin nhắn qua Zalo OA đến {parentName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Chọn mẫu tin nhắn</label>
            <Select value={selectedKey} onValueChange={onTemplateSelect}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingTemplates ? "Đang tải..." : "Chọn mẫu hoặc viết tự do"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {templates.map((tpl) => (
                  <SelectItem key={tpl.template_key} value={tpl.template_key}>
                    {tpl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Nội dung tin nhắn</label>
            <Textarea
              placeholder="Nhập hoặc chỉnh sửa nội dung tin nhắn..."
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              rows={6}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !messageBody.trim()}
          >
            {sending ? "Đang gửi..." : "Gửi tin nhắn"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
