"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { LeadActivity, LeadActivityType } from "@/lib/types/leads";

export async function createActivity(
  leadId: string,
  type: LeadActivityType,
  content: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Chưa đăng nhập" };
  }

  const { data, error } = await supabase
    .from("lead_activities")
    .insert({
      lead_id: leadId,
      type,
      content: content.trim(),
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/pipeline");
  return { data: data as LeadActivity };
}

export async function getActivities(leadId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Chưa đăng nhập" };
  }

  const { data, error } = await supabase
    .from("lead_activities")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message };
  }

  return { data: data as LeadActivity[] };
}
