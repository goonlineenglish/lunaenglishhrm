import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Đăng nhập | Luna English CRM",
  description: "Đăng nhập vào hệ thống quản lý tuyển sinh Luna English",
};

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
