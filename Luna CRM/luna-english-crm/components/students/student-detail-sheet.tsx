"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { StudentWithLead } from "@/lib/actions/student-actions";
import { StudentDetailInfo } from "./student-detail-info";

interface Props {
  student: StudentWithLead | null;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function StudentDetailSheet({ student, open, onClose, onRefresh }: Props) {
  if (!student) return null;

  const name = student.lead?.student_name ?? student.lead?.parent_name ?? "Học sinh";

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{name}</SheetTitle>
          <SheetDescription>
            {student.student_code ?? "Chưa có mã HS"}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="info" className="mt-4 px-4">
          <TabsList>
            <TabsTrigger value="info">Thông tin</TabsTrigger>
            <TabsTrigger value="lead">Lead gốc</TabsTrigger>
          </TabsList>
          <TabsContent value="info" className="mt-4">
            <StudentDetailInfo
              student={student}
              onUpdated={() => {
                onRefresh();
                onClose();
              }}
            />
          </TabsContent>
          <TabsContent value="lead" className="mt-4">
            {student.lead ? (
              <div className="space-y-3 text-sm">
                <InfoRow label="Tên học sinh" value={student.lead.student_name} />
                <InfoRow label="Phụ huynh" value={student.lead.parent_name} />
                <InfoRow label="SĐT" value={student.lead.parent_phone} />
                <InfoRow label="Email" value={student.lead.parent_email} />
                <InfoRow label="Nguồn" value={student.lead.source} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Không có lead liên kết</p>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? "—"}</span>
    </div>
  );
}
