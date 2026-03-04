"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Student } from "@/lib/types/users";
import { ensureUserProfile } from "./ensure-user-profile";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface StudentFilters {
  status?: import("@/lib/types/users").StudentStatus;
  current_class?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface StudentWithLead extends Student {
  lead?: {
    student_name: string | null;
    parent_name: string;
    parent_phone: string;
    parent_email: string | null;
    source: string;
  } | null;
}

export interface PaginatedStudents {
  data: StudentWithLead[];
  count: number;
  error?: string;
}

export async function getStudents(filters: StudentFilters = {}): Promise<PaginatedStudents> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], count: 0, error: "Chưa đăng nhập" };
  const { status, current_class, search, page = 1, pageSize = 20 } = filters;

  let query = supabase
    .from("students")
    .select(
      "*, lead:leads(student_name, parent_name, parent_phone, parent_email, source)",
      { count: "exact" }
    );

  if (status) query = query.eq("status", status);
  if (current_class) query = query.eq("current_class", current_class);
  if (search) {
    const term = `%${search}%`;
    query = query.or(
      `student_code.ilike.${term},lead.student_name.ilike.${term},lead.parent_name.ilike.${term},lead.parent_phone.ilike.${term}`
    );
  }

  query = query
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const { data, error, count } = await query;
  if (error) {
    console.error("getStudents error:", error.message);
    return { data: [], count: 0, error: "Không thể tải danh sách học sinh" };
  }
  return { data: (data ?? []) as StudentWithLead[], count: count ?? 0 };
}

export async function createStudent(data: {
  lead_id?: string;
  student_code?: string;
  current_class: string;
  current_level: string;
  enrollment_date: string;
  level_end_date?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  teacher_name?: string;
  tuition_amount?: number;
  payment_status?: string;
  program_type?: string;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Chưa đăng nhập" };

    const profileResult = await ensureUserProfile(supabase, user);
    if ("error" in profileResult) return { error: profileResult.error };

    const { data: student, error } = await supabase
      .from("students")
      .insert({
        lead_id: data.lead_id || null,
        student_code: data.student_code || null,
        current_class: data.current_class,
        current_level: data.current_level,
        enrollment_date: data.enrollment_date,
        level_end_date: data.level_end_date || null,
        date_of_birth: data.date_of_birth || null,
        gender: data.gender || null,
        address: data.address || null,
        teacher_name: data.teacher_name || null,
        tuition_amount: data.tuition_amount ?? null,
        payment_status: data.payment_status || "unpaid",
        program_type: data.program_type || null,
        status: "active",
        renewal_status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("createStudent error:", error.message);
      return { error: "Đã xảy ra lỗi khi tạo học sinh. Vui lòng thử lại." };
    }

    revalidatePath("/students");
    return { data: student as Student };
  } catch (error) {
    console.error("createStudent unexpected error:", error);
    return { error: "Đã xảy ra lỗi. Vui lòng thử lại." };
  }
}

export async function updateStudent(
  id: string,
  data: Partial<Pick<Student,
    | "student_code" | "current_class" | "current_level" | "enrollment_date"
    | "level_end_date" | "renewal_status" | "date_of_birth" | "gender"
    | "address" | "teacher_name" | "tuition_amount" | "payment_status" | "program_type"
  >>
) {
  if (!UUID_RE.test(id)) return { error: "ID không hợp lệ" };
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Chưa đăng nhập" };

    const profileResult = await ensureUserProfile(supabase, user);
    if ("error" in profileResult) return { error: profileResult.error };

    const { data: student, error } = await supabase
      .from("students")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("updateStudent error:", error.message);
      return { error: "Đã xảy ra lỗi khi cập nhật. Vui lòng thử lại." };
    }

    revalidatePath("/students");
    return { data: student as Student };
  } catch (error) {
    console.error("updateStudent unexpected error:", error);
    return { error: "Đã xảy ra lỗi. Vui lòng thử lại." };
  }
}
