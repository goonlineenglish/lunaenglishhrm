"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ensureUserProfile } from "./ensure-user-profile";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function importStudentsCSV(
  rows: Array<{
    lead_id?: string;
    student_code?: string;
    current_class: string;
    current_level: string;
    enrollment_date: string;
    level_end_date?: string;
    program_type?: string;
    teacher_name?: string;
    payment_status?: string;
  }>
): Promise<{ success: number; failed: number; errors: string[] }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: 0, failed: rows.length, errors: ["Chưa đăng nhập"] };

  const profileResult = await ensureUserProfile(supabase, user);
  if ("error" in profileResult) {
    return { success: 0, failed: rows.length, errors: [profileResult.error] };
  }

  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.lead_id && !UUID_RE.test(row.lead_id)) {
      failed++;
      errors.push(`Dòng ${i + 1}: lead_id không hợp lệ`);
      continue;
    }

    const { error } = await supabase.from("students").insert({
      lead_id: row.lead_id || null,
      student_code: row.student_code || null,
      current_class: row.current_class,
      current_level: row.current_level,
      enrollment_date: row.enrollment_date,
      level_end_date: row.level_end_date || null,
      program_type: row.program_type || null,
      teacher_name: row.teacher_name || null,
      payment_status: row.payment_status || "unpaid",
      status: "active",
      renewal_status: "pending",
    });

    if (error) {
      failed++;
      errors.push(`Dòng ${i + 1}: ${error.message}`);
    } else {
      success++;
    }
  }

  revalidatePath("/students");
  return { success, failed, errors };
}
