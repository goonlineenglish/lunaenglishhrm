"use server";

import { getAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

/**
 * Ensure the authenticated user has a row in public.users.
 *
 * The trigger `on_auth_user_created` should create this automatically,
 * but it can silently fail (e.g. when a user is created via the Supabase
 * Dashboard instead of the auth API, or on certain edge cases with
 * hosted Supabase). Without a public.users row the RLS helper function
 * `get_user_role()` returns NULL and every write operation hangs.
 *
 * Returns { role } on success or { error } on failure.
 */
export async function ensureUserProfile(
  supabase: SupabaseClient,
  user: User
): Promise<{ role: string } | { error: string }> {
  // Fast path: profile already exists (uses caller's client — works with RLS)
  const { data: existing } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (existing?.role) {
    return { role: existing.role };
  }

  // Profile missing — create via admin client (bypasses RLS)
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("ensureUserProfile: SUPABASE_SERVICE_ROLE_KEY not set, cannot create profile");
    return { error: "Cấu hình hệ thống thiếu. Liên hệ admin." };
  }

  const admin = getAdminClient();
  const role = user.user_metadata?.role ?? "advisor";
  const fullName =
    user.user_metadata?.full_name ?? user.email ?? "Unknown";

  const { error } = await admin.from("users").insert({
    id: user.id,
    email: user.email ?? "",
    full_name: fullName,
    role,
  });

  if (error && error.code !== "23505") {
    // 23505 = unique_violation (profile created by trigger between our check and insert)
    console.error("ensureUserProfile: insert failed:", error.message);
    return { error: "Không thể tạo hồ sơ người dùng. Liên hệ admin." };
  }

  console.log(
    `ensureUserProfile: created missing profile for ${user.email} (role=${role})`
  );
  return { role };
}
