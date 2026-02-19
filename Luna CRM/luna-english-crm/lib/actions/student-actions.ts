"use server";

import { createClient } from "@/lib/supabase/server";
import type { Student, StudentStatus, RenewalStatus } from "@/lib/types/users";

export interface StudentFilters {
  status?: StudentStatus;
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
}

export async function getStudents(
  filters: StudentFilters = {}
): Promise<PaginatedStudents> {
  const supabase = await createClient();
  const { status, current_class, search, page = 1, pageSize = 20 } = filters;

  let query = supabase
    .from("students")
    .select(
      "*, lead:leads(student_name, parent_name, parent_phone, parent_email, source)",
      { count: "exact" }
    );

  if (status) {
    query = query.eq("status", status);
  }
  if (current_class) {
    query = query.eq("current_class", current_class);
  }

  query = query
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Lỗi tải danh sách học sinh: ${error.message}`);
  }

  // Handle search client-side since it spans joined table
  let filtered = (data ?? []) as StudentWithLead[];
  if (search) {
    const term = search.toLowerCase();
    filtered = filtered.filter((s) => {
      const name = s.lead?.student_name ?? s.lead?.parent_name ?? "";
      const phone = s.lead?.parent_phone ?? "";
      const code = s.student_code ?? "";
      return (
        name.toLowerCase().includes(term) ||
        phone.includes(term) ||
        code.toLowerCase().includes(term)
      );
    });
  }

  return { data: filtered, count: count ?? 0 };
}

export async function createStudent(data: {
  lead_id?: string;
  student_code?: string;
  current_class: string;
  current_level: string;
  enrollment_date: string;
  level_end_date?: string;
}): Promise<Student> {
  const supabase = await createClient();

  const { data: student, error } = await supabase
    .from("students")
    .insert({
      lead_id: data.lead_id || null,
      student_code: data.student_code || null,
      current_class: data.current_class,
      current_level: data.current_level,
      enrollment_date: data.enrollment_date,
      level_end_date: data.level_end_date || null,
      status: "active" as StudentStatus,
      renewal_status: "pending" as RenewalStatus,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Lỗi tạo học sinh: ${error.message}`);
  }

  return student;
}

export async function updateStudent(
  id: string,
  data: Partial<Pick<Student, "student_code" | "current_class" | "current_level" | "enrollment_date" | "level_end_date" | "renewal_status">>
): Promise<Student> {
  const supabase = await createClient();

  const { data: student, error } = await supabase
    .from("students")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Lỗi cập nhật học sinh: ${error.message}`);
  }

  return student;
}

const VALID_TRANSITIONS: Record<StudentStatus, StudentStatus[]> = {
  active: ["paused", "graduated", "dropped"],
  paused: ["active"],
  graduated: [],
  dropped: [],
};

export async function changeStudentStatus(
  id: string,
  newStatus: StudentStatus,
  reason?: string
): Promise<Student> {
  const supabase = await createClient();

  // Get current status
  const { data: current, error: fetchError } = await supabase
    .from("students")
    .select("status")
    .eq("id", id)
    .single();

  if (fetchError) {
    throw new Error(`Không tìm thấy học sinh: ${fetchError.message}`);
  }

  const currentStatus = current.status as StudentStatus;
  const allowed = VALID_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Không thể chuyển từ "${currentStatus}" sang "${newStatus}"`
    );
  }

  // Require reason for paused and dropped
  if ((newStatus === "paused" || newStatus === "dropped") && !reason) {
    throw new Error("Cần có lý do khi bảo lưu hoặc nghỉ học");
  }

  const { data: student, error } = await supabase
    .from("students")
    .update({ status: newStatus })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Lỗi chuyển trạng thái: ${error.message}`);
  }

  return student;
}

export async function importStudentsCSV(
  rows: Array<{
    lead_id?: string;
    student_code?: string;
    current_class: string;
    current_level: string;
    enrollment_date: string;
    level_end_date?: string;
  }>
): Promise<{ success: number; failed: number; errors: string[] }> {
  const supabase = await createClient();
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const { error } = await supabase.from("students").insert({
      lead_id: row.lead_id || null,
      student_code: row.student_code || null,
      current_class: row.current_class,
      current_level: row.current_level,
      enrollment_date: row.enrollment_date,
      level_end_date: row.level_end_date || null,
      status: "active" as StudentStatus,
      renewal_status: "pending" as RenewalStatus,
    });

    if (error) {
      failed++;
      errors.push(`Dòng ${i + 1}: ${error.message}`);
    } else {
      success++;
    }
  }

  return { success, failed, errors };
}
