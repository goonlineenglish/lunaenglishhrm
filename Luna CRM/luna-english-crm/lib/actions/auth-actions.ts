"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ensureUserProfile } from "./ensure-user-profile";

export async function signIn(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "Sai email hoặc mật khẩu" };
  }

  // Ensure public.users row exists (trigger on_auth_user_created may have failed)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await ensureUserProfile(supabase, user);
  }

  redirect("/pipeline");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
