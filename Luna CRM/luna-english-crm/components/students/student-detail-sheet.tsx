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
import { StudentLearningPathTab } from "./student-learning-path-tab";
import { StudentAttendanceTab } from "./student-attendance-tab";
import { StudentScoresTab } from "./student-scores-tab";

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
      </SheetContent>
    </Sheet>
  );
}
