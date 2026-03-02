import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { UserRole } from "@/lib/types/users";
import { getStudents } from "@/lib/actions/student-actions";
import { StudentsClient } from "./students-client";

export const metadata: Metadata = {
  title: "Học sinh | Luna English CRM",
  description: "Quản lý danh sách học sinh đã đăng ký và theo dõi trạng thái",
};

export default async function StudentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = (profile?.role as UserRole) ?? "advisor";
  const { data: students, count } = await getStudents();

  return <StudentsClient initialStudents={students} initialCount={count} userRole={role} />;
}
