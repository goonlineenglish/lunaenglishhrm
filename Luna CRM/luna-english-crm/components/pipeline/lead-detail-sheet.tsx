"use client";

import { useState } from "react";
import type { LeadWithAssignee } from "@/lib/hooks/use-realtime-leads";
import type { Lead } from "@/lib/types/leads";
import type { UserRole } from "@/lib/types/users";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Mail, Trash2 } from "lucide-react";
import { LeadDetailInfo } from "@/components/pipeline/lead-detail-info";
import { LeadDetailActivities } from "@/components/pipeline/lead-detail-activities";
import { LeadDetailReminders } from "@/components/pipeline/lead-detail-reminders";
import { LeadDetailZalo } from "@/components/pipeline/lead-detail-zalo";
import { LeadStageNotesPanel } from "@/components/pipeline/lead-stage-notes-panel";
import { SendEmailDialog } from "@/components/pipeline/send-email-dialog";
import { DeleteConfirmationDialog } from "@/components/shared/delete-confirmation-dialog";
import { deleteLead } from "@/lib/actions/lead-actions";
import { toast } from "sonner";

interface Advisor {
  id: string;
  full_name: string;
  role: string;
}

interface LeadDetailSheetProps {
  lead: LeadWithAssignee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  advisors: Advisor[];
  userRole: UserRole;
  onLeadUpdated: (lead: Lead) => void;
}

export function LeadDetailSheet({
  lead,
  open,
  onOpenChange,
  advisors,
  userRole,
  onLeadUpdated,
}: LeadDetailSheetProps) {
  const [emailOpen, setEmailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const canDelete = userRole === "admin" || userRole === "advisor";

  async function handleDelete() {
    if (!lead) return;
    setDeleteLoading(true);
    const result = await deleteLead(lead.id);
    setDeleteLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Đã xóa lead");
      setDeleteOpen(false);
      onOpenChange(false);
    }
  }

  if (!lead) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>{lead.parent_name}</SheetTitle>
              <SheetDescription>{lead.parent_phone}</SheetDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEmailOpen(true)}
                title="Gửi Email"
              >
                <Mail className="mr-1.5 size-4" />
                Gửi Email
              </Button>
              {canDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                  title="Xóa lead"
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>
        <div className="mt-4 px-4">
          <Tabs defaultValue="info">
            <TabsList className="w-full">
              <TabsTrigger value="info" className="flex-1">
                Thông tin
              </TabsTrigger>
              <TabsTrigger value="activities" className="flex-1">
                Lịch sử
              </TabsTrigger>
              <TabsTrigger value="reminders" className="flex-1">
                Nhắc nhở
              </TabsTrigger>
              <TabsTrigger value="zalo" className="flex-1">
                Zalo
              </TabsTrigger>
              <TabsTrigger value="stage-notes" className="flex-1">
                Ghi chú
              </TabsTrigger>
            </TabsList>
            <TabsContent value="info" className="mt-4">
              <LeadDetailInfo
                lead={lead}
                advisors={advisors}
                userRole={userRole}
                onLeadUpdated={onLeadUpdated}
              />
            </TabsContent>
            <TabsContent value="activities" className="mt-4">
              <LeadDetailActivities leadId={lead.id} currentStage={lead.current_stage} />
            </TabsContent>
            <TabsContent value="reminders" className="mt-4">
              <LeadDetailReminders />
            </TabsContent>
            <TabsContent value="zalo" className="mt-4">
              <LeadDetailZalo
                leadId={lead.id}
                currentStage={lead.current_stage}
                parentName={lead.parent_name}
                studentName={lead.student_name ?? null}
              />
            </TabsContent>
            <TabsContent value="stage-notes" className="mt-4">
              <LeadStageNotesPanel
                leadId={lead.id}
                currentStage={lead.current_stage}
              />
            </TabsContent>
          </Tabs>
        </div>

        <SendEmailDialog
          leadId={lead.id}
          currentStage={lead.current_stage}
          parentEmail={lead.parent_email}
          open={emailOpen}
          onOpenChange={setEmailOpen}
        />

        <DeleteConfirmationDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Xóa lead"
          description={`Bạn có chắc muốn xóa lead "${lead.parent_name}"? Dữ liệu sẽ được chuyển vào thùng rác.`}
          onConfirm={handleDelete}
          loading={deleteLoading}
        />
      </SheetContent>
    </Sheet>
  );
}
