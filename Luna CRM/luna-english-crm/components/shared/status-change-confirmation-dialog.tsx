"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface StatusChangeConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  requireReason: boolean;
  onConfirm: (reason?: string) => void;
  loading?: boolean;
}

export function StatusChangeConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  requireReason,
  onConfirm,
  loading = false,
}: StatusChangeConfirmationDialogProps) {
  const [reason, setReason] = useState("");

  function handleConfirm() {
    onConfirm(requireReason ? reason : undefined);
    setReason("");
  }

  function handleOpenChange(val: boolean) {
    if (!val) setReason("");
    onOpenChange(val);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {requireReason && (
          <div className="space-y-2">
            <Label htmlFor="confirm-reason">Lý do *</Label>
            <Textarea
              id="confirm-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Nhập lý do..."
              rows={3}
            />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Hủy
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading || (requireReason && !reason.trim())}
          >
            {loading ? "Đang xử lý..." : "Xác nhận"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
