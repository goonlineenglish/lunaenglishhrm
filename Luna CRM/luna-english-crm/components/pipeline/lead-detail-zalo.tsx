"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { checkZaloConnection } from "@/lib/actions/zalo-message-actions";
import { SendZaloDialog } from "@/components/pipeline/send-zalo-dialog";
import type { LeadStage } from "@/lib/types/leads";

interface LeadDetailZaloProps {
  leadId: string;
  currentStage: LeadStage;
  parentName: string;
  studentName: string | null;
}

export function LeadDetailZalo({
  leadId,
  currentStage,
  parentName,
  studentName,
}: LeadDetailZaloProps) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const checkConnection = useCallback(async () => {
    const result = await checkZaloConnection(leadId);
    setConnected(result.connected);
  }, [leadId]);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Loading state
  if (connected === null) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm text-muted-foreground">Đang kiểm tra kết nối Zalo...</p>
      </div>
    );
  }

  // Not connected — show guidance
  if (!connected) {
    return (
      <div className="text-center py-8 space-y-2">
        <Badge variant="outline" className="text-amber-600 border-amber-300">
          Chưa kết nối
        </Badge>
        <p className="text-sm text-muted-foreground">
          Lead này chưa follow Zalo OA.
        </p>
        <p className="text-xs text-muted-foreground">
          Hướng dẫn: Gửi link Zalo OA cho phụ huynh qua SMS/Facebook
          để họ follow, sau đó có thể gửi tin nhắn Zalo.
        </p>
      </div>
    );
  }

  // Connected — show send button
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-green-600 border-green-300">
          Đã kết nối
        </Badge>
        <span className="text-sm text-muted-foreground">
          Lead đã follow Zalo OA
        </span>
      </div>

      <Button onClick={() => setDialogOpen(true)} size="sm">
        Gửi tin nhắn Zalo
      </Button>

      <p className="text-xs text-muted-foreground">
        Tin nhắn sẽ được gửi qua hàng đợi. Nếu thất bại, hệ thống sẽ tự động
        thử lại tối đa 5 lần.
      </p>

      <SendZaloDialog
        leadId={leadId}
        currentStage={currentStage}
        parentName={parentName}
        studentName={studentName}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
