"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string | null;
  type: "info" | "warning" | "error" | "success" | "reminder";
  is_read: boolean;
  link: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function getNotifications(
  userId: string,
  limit: number = 20
): Promise<{ data: Notification[]; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { data: [], error: error.message };

  return { data: (data as Notification[]) ?? [] };
}

export async function getUnreadCount(
  userId: string
): Promise<{ count: number; error?: string }> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) return { count: 0, error: error.message };

  return { count: count ?? 0 };
}

export async function markRead(
  id: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true };
}

export async function markAllRead(
  userId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true };
}
