import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/pipeline");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#3E1A51] via-[#2d1240] to-[#1a0b26] px-4">
      <LoginForm />
    </div>
  );
}
