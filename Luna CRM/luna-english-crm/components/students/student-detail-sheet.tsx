"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { StudentWithLead } from "@/lib/actions/student-actions";
import type { UserRole } from "@/lib/types/users";
import { StudentDetailInfo } from "./student-detail-info";
import { StudentLearningPathTab } from "./student-learning-path-tab";
import { StudentAttendanceTab } from "./student-attendance-tab";
import { StudentScoresTab } from "./student-scores-tab";
import { DeleteConfirmationDialog } from "@/components/shared/delete-confirmation-dialog";
import { softDeleteStudent } from "@/lib/actions/soft-delete-actions";
import { toast } from "sonner";

interface Props {
  student: StudentWithLead | null;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
  userRole?: UserRole;
}

export function StudentDetailSheet({ student, open, onClose, onRefresh, userRole }: Props) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  if (!student) return null;

  const name = student.lead?.student_name ?? student.lead?.parent_name ?? "Học sinh";

  async function handleDelete() {
    if (!student) return;
    setDeleteLoading(true);
    const result = await softDeleteStudent(student.id);
    setDeleteLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Đã xóa học sinh");
      setDeleteOpen(false);
      onClose();
      onRefresh();
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>{name}</SheetTitle>
              <SheetDescription>
                {student.student_code ?? "Chưa có mã HS"}
              </SheetDescription>
            </div>
            {userRole === "admin" && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
                title="Xóa học sinh"
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        </SheetHeader>

        <Tabs defaultValue="info" className="mt-4 px-4">
          <TabsList className="w-full">
            <TabsTrigger value="info" className="flex-1">Hồ sơ</TabsTrigger>
            <TabsTrigger value="path" className="flex-1">Lộ trình</TabsTrigger>
            <TabsTrigger value="attendance" className="flex-1">Điểm danh</TabsTrigger>
            <TabsTrigger value="scores" className="flex-1">Điểm số</TabsTrigger>
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
          <TabsContent value="path" className="mt-4">
            <StudentLearningPathTab studentId={student.id} />
          </TabsContent>
          <TabsContent value="attendance" className="mt-4">
            <StudentAttendanceTab studentId={student.id} />
          </TabsContent>
          <TabsContent value="scores" className="mt-4">
            <StudentScoresTab studentId={student.id} />
          </TabsContent>
        </Tabs>

        <DeleteConfirmationDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Xóa học sinh"
          description={`Bạn có chắc muốn xóa "${name}"? Dữ liệu sẽ được chuyển vào thùng rác.`}
          onConfirm={handleDelete}
          loading={deleteLoading}
        />
      </SheetContent>
    </Sheet>
  );
}
