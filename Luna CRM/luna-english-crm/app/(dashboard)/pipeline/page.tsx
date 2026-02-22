import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { UserRole } from "@/lib/types/users";
import { PipelineView } from "@/components/pipeline/pipeline-view";
import type { LeadWithAssignee } from "@/lib/hooks/use-realtime-leads";

export const metadata: Metadata = {
  title: "Pipeline | Luna English CRM",
  description: "Quản lý pipeline tuyển sinh - theo dõi leads qua các giai đoạn",
};

export default async function PipelinePage() {
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

  // Fetch leads with assigned user join
  const { data: leads } = await supabase
    .from("leads")
    .select("*, users:assigned_to(full_name)")
    .order("created_at", { ascending: false });

  // Fetch advisors list for assignment
  const { data: advisors } = await supabase
    .from("users")
    .select("id, full_name, role")
    .in("role", ["admin", "advisor"])
    .eq("is_active", true)
    .order("full_name");

  return (
    <PipelineView
      initialLeads={(leads as LeadWithAssignee[]) ?? []}
      advisors={advisors ?? []}
      userRole={role}
      userId={user.id}
    />
  );
}
