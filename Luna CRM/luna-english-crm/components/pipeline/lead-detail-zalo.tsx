"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { sendZaloMessage } from "@/lib/actions/message-actions";

interface LeadDetailZaloProps {
  leadId: string;
  leadSource: string;
}

export function LeadDetailZalo({ leadId, leadSource }: LeadDetailZaloProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const isZaloLead = leadSource === "zalo";

  async function handleSend() {
    if (!message.trim()) {
      toast.error("Vui lòng nhập nội dung tin nhắn");
      return;
    }

    setSending(true);
    const result = await sendZaloMessage(leadId, message.trim());
    setSending(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Đã gửi tin nhắn qua Zalo");
      setMessage("");
    }
  }

  if (!isZaloLead) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">
          Lead này không đến từ Zalo.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Chỉ có thể gửi tin nhắn cho lead có nguồn Zalo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="outline">Zalo OA</Badge>
        <span className="text-sm text-muted-foreground">
          Gửi tin nhắn qua Zalo Official Account
        </span>
      </div>

      <div className="space-y-2">
        <Textarea
          placeholder="Nhập nội dung tin nhắn..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
        />
        <Button
          onClick={handleSend}
          disabled={sending || !message.trim()}
          size="sm"
        >
          {sending ? "Đang gửi..." : "Gửi tin nhắn Zalo"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Tin nhắn sẽ được gửi qua hàng đợi. Nếu thất bại, hệ thống sẽ tự động
        thử lại tối đa 5 lần.
      </p>
    </div>
  );
}
