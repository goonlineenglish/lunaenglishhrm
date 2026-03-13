"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Student, StudentStatus } from "@/lib/types/users";
import { ensureUserProfile } from "./ensure-user-profile";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_TRANSITIONS: Record<StudentStatus, StudentStatus[]> = {
  active: ["paused", "graduated", "dropped"],
  paused: ["active"],
  graduated: [],
  dropped: [],
};

export async function changeStudentStatus(id: string, newStatus: StudentStatus, reason?: string) {
  if (!UUID_RE.test(id)) return { error: "ID không hợp lệ" };
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Chưa đăng nhập" };

    const profileResult = await ensureUserProfile(supabase, user);
    if ("error" in profileResult) return { error: profileResult.error };

    const { data: current, error: fetchError } = await supabase
      .from("students").select("status").eq("id", id).is("deleted_at", null).single();
    if (fetchError || !current) return { error: "Không tìm thấy học sinh" };

    const currentStatus = current.status as StudentStatus;
    const allowed = VALID_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(newStatus)) {
      return { error: `Không thể chuyển từ "${currentStatus}" sang "${newStatus}"` };
    }
    if ((newStatus === "paused" || newStatus === "dropped") && !reason) {
      return { error: "Cần có lý do khi bảo lưu hoặc nghỉ học" };
    }

    const { data: student, error } = await supabase
      .from("students").update({ status: newStatus }).eq("id", id).select().single();
    if (error) {
      console.error("changeStudentStatus error:", error.message, error.code);
      if (error.code === "42501") return { error: "Bạn không có quyền thay đổi trạng thái học sinh." };
      return { error: "Đã xảy ra lỗi khi chuyển trạng thái. Vui lòng thử lại." };
    }

    revalidatePath("/students");
    return { data: student as Student };
  } catch (error) {
    console.error("changeStudentStatus unexpected error:", error);
    return { error: "Đã xảy ra lỗi. Vui lòng thử lại." };
  }
}

export interface BulkStudentResult {
  succeeded: string[];
  failed: { id: string; error: string }[];
}

export async function bulkChangeStudentStatus(
  studentIds: string[],
  newStatus: StudentStatus,
  reason?: string
): Promise<BulkStudentResult> {
  const result: BulkStudentResult = { succeeded: [], failed: [] };

  if ((newStatus === "paused" || newStatus === "dropped") && !reason?.trim()) {
    return { succeeded: [], failed: studentIds.map((id) => ({ id, error: "Cần có lý do" })) };
  }

  const validIds: string[] = [];
  for (const id of studentIds) {
    if (!UUID_RE.test(id)) result.failed.push({ id, error: "ID không hợp lệ" });
    else validIds.push(id);
  }
  if (validIds.length === 0) return result;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { succeeded: [], failed: studentIds.map((id) => ({ id, error: "Chưa đăng nhập" })) };
    }

    const profileResult = await ensureUserProfile(supabase, user);
    if ("error" in profileResult) {
      return { succeeded: [], failed: studentIds.map((id) => ({ id, error: profileResult.error })) };
    }

    const { data: currentStudents } = await supabase
      .from("students").select("id, status").in("id", validIds).is("deleted_at", null);
    if (!currentStudents) {
      return { succeeded: [], failed: validIds.map((id) => ({ id, error: "Không tìm thấy" })) };
    }

    const statusMap = new Map(currentStudents.map((s) => [s.id, s.status as StudentStatus]));
    const eligible: string[] = [];
    for (const id of validIds) {
      const currentStatus = statusMap.get(id);
      if (!currentStatus) {
        result.failed.push({ id, error: "Không tìm thấy" });
      } else {
        const allowed = VALID_TRANSITIONS[currentStatus] ?? [];
        if (!allowed.includes(newStatus)) {
          result.failed.push({ id, error: `Không thể chuyển từ ${currentStatus}` });
        } else {
          eligible.push(id);
        }
      }
    }

    if (eligible.length > 0) {
      const { error } = await supabase
        .from("students").update({ status: newStatus }).in("id", eligible);
      if (error) {
        const errMsg = error.code === "42501" ? "Không đủ quyền" : "Lỗi cập nhật";
        eligible.forEach((id) => result.failed.push({ id, error: errMsg }));
      } else {
        result.succeeded.push(...eligible);
      }
    }

    revalidatePath("/students");
    return result;
  } catch (error) {
    console.error("bulkChangeStudentStatus unexpected error:", error);
    return { succeeded: [], failed: studentIds.map((id) => ({ id, error: "Lỗi hệ thống" })) };
  }
}
