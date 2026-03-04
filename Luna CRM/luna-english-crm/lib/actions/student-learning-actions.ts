"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ensureUserProfile } from "./ensure-user-profile";
import type { LearningPath, LearningMilestone } from "@/lib/types/student-hub-types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getLearningPath(
  studentId: string
): Promise<{ data: (LearningPath & { milestones: LearningMilestone[] }) | null; error?: string }> {
  if (!UUID_RE.test(studentId)) return { data: null, error: "ID không hợp lệ" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Chưa đăng nhập" };

  const { data: path, error } = await supabase
    .from("learning_paths")
    .select("*")
    .eq("student_id", studentId)
    .maybeSingle();

  if (error) {
    console.error("getLearningPath error:", error.message);
    return { data: null, error: "Không thể tải lộ trình học" };
  }
  if (!path) return { data: null };

  const { data: milestones } = await supabase
    .from("learning_milestones")
    .select("*")
    .eq("learning_path_id", path.id)
    .order("achieved_at", { ascending: true });

  return { data: { ...(path as LearningPath), milestones: (milestones ?? []) as LearningMilestone[] } };
}

export async function upsertLearningPath(
  studentId: string,
  data: { program_type: string; current_level?: string; current_session?: number; started_at?: string }
): Promise<{ data: LearningPath | null; error?: string }> {
  if (!UUID_RE.test(studentId)) return { data: null, error: "ID không hợp lệ" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Chưa đăng nhập" };

  const profileResult = await ensureUserProfile(supabase, user);
  if ("error" in profileResult) return { data: null, error: profileResult.error };

  const { data: path, error } = await supabase
    .from("learning_paths")
    .upsert({
      student_id: studentId,
      program_type: data.program_type,
      current_level: data.current_level ?? null,
      current_session: data.current_session ?? 0,
      started_at: data.started_at ?? null,
    }, { onConflict: "student_id" })
    .select()
    .single();

  if (error) {
    console.error("upsertLearningPath error:", error.message);
    return { data: null, error: "Không thể lưu lộ trình học" };
  }

  revalidatePath("/students");
  return { data: path as LearningPath };
}

export async function addMilestone(
  learningPathId: string,
  data: { milestone_type: string; milestone_name: string; achieved_at?: string }
): Promise<{ data: LearningMilestone | null; error?: string }> {
  if (!UUID_RE.test(learningPathId)) return { data: null, error: "ID không hợp lệ" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Chưa đăng nhập" };

  const profileResult = await ensureUserProfile(supabase, user);
  if ("error" in profileResult) return { data: null, error: profileResult.error };

  const { data: milestone, error } = await supabase
    .from("learning_milestones")
    .insert({
      learning_path_id: learningPathId,
      milestone_type: data.milestone_type,
      milestone_name: data.milestone_name,
      achieved_at: data.achieved_at ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("addMilestone error:", error.message);
    return { data: null, error: "Không thể thêm mốc học" };
  }

  return { data: milestone as LearningMilestone };
}
