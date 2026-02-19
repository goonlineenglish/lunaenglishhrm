import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { getNavItemsForRole } from "@/lib/constants/navigation";
import type { UserRole } from "@/lib/types/users";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  const fullName = profile?.full_name ?? user.email ?? "User";
  const role = (profile?.role as UserRole) ?? "advisor";
  const navItems = getNavItemsForRole(role);

  return (
    <div className="min-h-screen">
      <Sidebar navItems={navItems} fullName={fullName} role={role} />
      <div className="lg:pl-64">
        <Header
          navItems={navItems}
          fullName={fullName}
          email={user.email ?? ""}
          role={role}
          userId={user.id}
        />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
