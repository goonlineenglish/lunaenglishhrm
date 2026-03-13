"use server";

import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { ensureUserProfile } from "./ensure-user-profile";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---- Soft delete student (admin only) ----

export async function softDeleteStudent(studentId: string) {
  if (!UUID_RE.test(studentId)) return { error: "ID không hợp lệ" };
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Chưa đăng nhập" };

    const profileResult = await ensureUserProfile(supabase, user);
    if ("error" in profileResult) return { error: profileResult.error };
    if (profileResult.role !== "admin") {
      return { error: "Chỉ admin mới có thể xóa học sinh" };
    }

    const { data, error } = await supabase
      .from("students")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", studentId)
      .is("deleted_at", null)
      .select("id")
      .single();

    if (error || !data) {
      if (error?.code === "PGRST116") {
        return { error: "Học sinh không tồn tại hoặc đã bị xóa" };
      }
      console.error("softDeleteStudent error:", error?.message);
      return { error: "Đã xảy ra lỗi. Vui lòng thử lại." };
    }

    revalidatePath("/students");
    return { success: true };
  } catch (error) {
    console.error("softDeleteStudent unexpected:", error);
    return { error: "Đã xảy ra lỗi. Vui lòng thử lại." };
  }
}

export async function restoreStudent(studentId: string) {
  if (!UUID_RE.test(studentId)) return { error: "ID không hợp lệ" };
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Chưa đăng nhập" };

    const profileResult = await ensureUserProfile(supabase, user);
    if ("error" in profileResult) return { error: profileResult.error };
    if (profileResult.role !== "admin") {
      return { error: "Chỉ admin mới có thể khôi phục học sinh" };
    }

    const { data, error } = await supabase
      .from("students")
      .update({ deleted_at: null })
      .eq("id", studentId)
      .not("deleted_at", "is", null)
      .select("id")
      .single();

    if (error || !data) {
      if (error?.code === "PGRST116") {
        return { error: "Học sinh không tồn tại hoặc chưa bị xóa" };
      }
      console.error("restoreStudent error:", error?.message);
      return { error: "Đã xảy ra lỗi. Vui lòng thử lại." };
    }

    revalidatePath("/students");
    revalidatePath("/trash");
    return { success: true };
  } catch (error) {
    console.error("restoreStudent unexpected:", error);
    return { error: "Đã xảy ra lỗi. Vui lòng thử lại." };
  }
}

// ---- Soft delete activity (admin or own) ----

export async function softDeleteActivity(activityId: string) {
  if (!UUID_RE.test(activityId)) return { error: "ID không hợp lệ" };
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Chưa đăng nhập" };

    const profileResult = await ensureUserProfile(supabase, user);
    if ("error" in profileResult) return { error: profileResult.error };

    const role = profileResult.role;
    if (role === "marketing") {
      return { error: "Bạn không có quyền xóa hoạt động" };
    }

    // Advisor: can only delete own activities
    if (role === "advisor") {
      const { data: activity } = await supabase
        .from("lead_activities")
        .select("created_by")
        .eq("id", activityId)
        .single();
      if (!activity || activity.created_by !== user.id) {
        return { error: "Bạn chỉ có thể xóa hoạt động của mình" };
      }
    }

    const { data, error } = await supabase
      .from("lead_activities")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", activityId)
      .is("deleted_at", null)
      .select("id")
      .single();

    if (error || !data) {
      if (error?.code === "PGRST116") {
        return { error: "Hoạt động không tồn tại hoặc đã bị xóa" };
      }
      console.error("softDeleteActivity error:", error?.message);
      return { error: "Đã xảy ra lỗi. Vui lòng thử lại." };
    }

    revalidatePath("/pipeline");
    return { success: true };
  } catch (error) {
    console.error("softDeleteActivity unexpected:", error);
    return { error: "Đã xảy ra lỗi. Vui lòng thử lại." };
  }
}

export async function restoreActivity(activityId: string) {
  if (!UUID_RE.test(activityId)) return { error: "ID không hợp lệ" };
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Chưa đăng nhập" };

    const profileResult = await ensureUserProfile(supabase, user);
    if ("error" in profileResult) return { error: profileResult.error };
    if (profileResult.role !== "admin") {
      return { error: "Chỉ admin mới có thể khôi phục hoạt động" };
    }

    const { data, error } = await supabase
      .from("lead_activities")
      .update({ deleted_at: null })
      .eq("id", activityId)
      .not("deleted_at", "is", null)
      .select("id")
      .single();

    if (error || !data) {
      if (error?.code === "PGRST116") {
        return { error: "Hoạt động không tồn tại hoặc chưa bị xóa" };
      }
      console.error("restoreActivity error:", error?.message);
      return { error: "Đã xảy ra lỗi. Vui lòng thử lại." };
    }

    revalidatePath("/pipeline");
    revalidatePath("/trash");
    return { success: true };
  } catch (error) {
    console.error("restoreActivity unexpected:", error);
    return { error: "Đã xảy ra lỗi. Vui lòng thử lại." };
  }
}

// ---- Admin trash listing (uses admin client to bypass RLS) ----

export async function getDeletedLeads() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Chưa đăng nhập" };

    const profileResult = await ensureUserProfile(supabase, user);
    if ("error" in profileResult) return { data: null, error: profileResult.error };
    if (profileResult.role !== "admin") {
      return { data: null, error: "Chỉ admin" };
    }

    const admin = getAdminClient();
    const { data, error } = await admin
      .from("leads")
      .select("id, student_name, parent_name, parent_phone, current_stage, deleted_at, assigned_to")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data };
  } catch (error) {
    console.error("getDeletedLeads error:", error);
    return { data: null, error: "Đã xảy ra lỗi" };
  }
}

export async function getDeletedStudents() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Chưa đăng nhập" };

    const profileResult = await ensureUserProfile(supabase, user);
    if ("error" in profileResult) return { data: null, error: profileResult.error };
    if (profileResult.role !== "admin") {
      return { data: null, error: "Chỉ admin" };
    }

    const admin = getAdminClient();
    const { data, error } = await admin
      .from("students")
      .select("id, student_code, full_name, program_type, status, deleted_at")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data };
  } catch (error) {
    console.error("getDeletedStudents error:", error);
    return { data: null, error: "Đã xảy ra lỗi" };
  }
}

export async function getDeletedActivities() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Chưa đăng nhập" };

    const profileResult = await ensureUserProfile(supabase, user);
    if ("error" in profileResult) return { data: null, error: profileResult.error };
    if (profileResult.role !== "admin") {
      return { data: null, error: "Chỉ admin" };
    }

    const admin = getAdminClient();
    const { data, error } = await admin
      .from("lead_activities")
      .select("id, lead_id, type, title, content, deleted_at")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data };
  } catch (error) {
    console.error("getDeletedActivities error:", error);
    return { data: null, error: "Đã xảy ra lỗi" };
  }
}
