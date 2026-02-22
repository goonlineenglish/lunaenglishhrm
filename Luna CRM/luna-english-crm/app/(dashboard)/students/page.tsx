import type { Metadata } from "next";
import { getStudents } from "@/lib/actions/student-actions";
import { StudentsClient } from "./students-client";

export const metadata: Metadata = {
  title: "Học sinh | Luna English CRM",
  description: "Quản lý danh sách học sinh đã đăng ký và theo dõi trạng thái",
};

export default async function StudentsPage() {
  const { data: students, count } = await getStudents();

  return <StudentsClient initialStudents={students} initialCount={count} />;
}
