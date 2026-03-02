"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Mail, Loader2 } from "lucide-react";
import type { LeadStage } from "@/lib/types/leads";
import {
  getEmailTemplates,
  sendLeadEmail,
  getLeadTemplateVars,
  type EmailTemplate,
} from "@/lib/actions/email-actions";
import { renderTemplate } from "@/lib/utils/template-renderer";

interface SendEmailDialogProps {
  leadId: string;
  currentStage: LeadStage;
  parentEmail: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendEmailDialog({
  leadId,
  currentStage,
  parentEmail,
  open,
  onOpenChange,
}: SendEmailDialogProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [vars, setVars] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [tplRes, varsRes] = await Promise.all([
      getEmailTemplates(currentStage),
      getLeadTemplateVars(leadId),
    ]);

    if (tplRes.data) setTemplates(tplRes.data);
    if (varsRes.data) setVars(varsRes.data);
    setLoading(false);
  }, [leadId, currentStage]);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on dialog open
      loadData();
      setSelectedKey("");
      setSubject("");
      setBodyHtml("");
    }
  }, [open, loadData]);

  function handleTemplateSelect(key: string) {
    setSelectedKey(key);
    if (key === "custom") {
      setSubject("");
      setBodyHtml("");
      return;
    }
    const tpl = templates.find((t) => t.template_key === key);
    if (!tpl) return;
    setSubject(renderTemplate(tpl.subject, vars));
    setBodyHtml(renderTemplate(tpl.body_html, vars));
  }

  async function handleSend() {
    if (!subject.trim()) {
      toast.error("Vui lòng nhập tiêu đề email");
      return;
    }
    if (!bodyHtml.trim()) {
      toast.error("Vui lòng nhập nội dung email");
      return;
    }

    setSending(true);
    const result = await sendLeadEmail(leadId, subject.trim(), bodyHtml.trim());
    setSending(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Đã gửi email thành công");
    onOpenChange(false);
  }

  if (!parentEmail) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gửi Email</DialogTitle>
            <DialogDescription>
              Lead chưa có địa chỉ email. Vui lòng cập nhật thông tin lead trước.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="size-5" />
            Gửi Email
          </DialogTitle>
          <DialogDescription>
            Gửi đến: {parentEmail}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Template selector */}
            <div className="space-y-1.5">
              <Label>Mẫu email</Label>
              <Select value={selectedKey} onValueChange={handleTemplateSelect}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn mẫu email..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Soạn tự do</SelectItem>
                  {templates.map((tpl) => (
                    <SelectItem key={tpl.template_key} value={tpl.template_key}>
                      {tpl.name}
                      {tpl.stage === currentStage ? " (gợi ý)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <Label htmlFor="email-subject">Tiêu đề</Label>
              <Input
                id="email-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Nhập tiêu đề email..."
              />
            </div>

            {/* Body */}
            <div className="space-y-1.5">
              <Label htmlFor="email-body">Nội dung</Label>
              <Textarea
                id="email-body"
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                rows={8}
                placeholder="Nhập nội dung email..."
                className="font-mono text-sm"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleSend} disabled={sending || loading}>
            {sending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Đang gửi...
              </>
            ) : (
              "Gửi Email"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
