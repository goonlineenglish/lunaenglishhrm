import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { UserRole } from "@/lib/types/users";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export default async function ReportsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = (profile?.role as UserRole) ?? "advisor";

  if (role === "advisor") {
    redirect("/pipeline");
  }

  return <DashboardView />;
}
