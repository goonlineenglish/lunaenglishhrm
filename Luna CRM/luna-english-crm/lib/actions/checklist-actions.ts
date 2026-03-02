"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { StageNextStepConfig, StageNextStep, LeadStage } from "@/lib/types/leads";

export async function getStageConfigs() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Chưa đăng nhập" };
  }

  const { data, error } = await supabase
    .from("stage_next_step_configs")
    .select("*")
    .order("stage");

  if (error) {
    return { error: "Không thể tải cấu hình" };
  }

  return { data: data as StageNextStepConfig[] };
}

export async function updateStageNextStepsConfig(
  stage: LeadStage,
  steps: StageNextStep[]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Chưa đăng nhập" };
  }

  // Admin-only check
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { error: "Chỉ admin mới có quyền" };
  }

  const { error } = await supabase
    .from("stage_next_step_configs")
    .upsert(
      {
        stage,
        steps: JSON.parse(JSON.stringify(steps)),
        updated_by: user.id,
      },
      { onConflict: "stage" }
    );

  if (error) {
    return { error: "Không thể cập nhật" };
  }

  revalidatePath("/settings");
  return { success: true };
}
