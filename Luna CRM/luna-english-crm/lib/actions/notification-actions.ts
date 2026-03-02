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

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Fetch notifications for the currently authenticated user
export async function getNotifications(
  limit: number = 20
): Promise<{ data: Notification[]; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Chưa đăng nhập" };

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { data: [], error: error.message };

  return { data: (data as Notification[]) ?? [] };
}

// Get unread notification count for the currently authenticated user
export async function getUnreadCount(): Promise<{
  count: number;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { count: 0, error: "Chưa đăng nhập" };

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) return { count: 0, error: error.message };

  return { count: count ?? 0 };
}

// Mark a single notification as read — validates auth and UUID before update
export async function markRead(
  id: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Chưa đăng nhập" };

  if (!UUID_REGEX.test(id)) return { error: "ID không hợp lệ" };

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("user_id", user.id); // scoped to caller's own notifications only

  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true };
}

// Mark all notifications as read for the currently authenticated user
export async function markAllRead(): Promise<{
  success?: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Chưa đăng nhập" };

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true };
}
