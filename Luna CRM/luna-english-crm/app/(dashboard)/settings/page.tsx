import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { UserRole } from "@/lib/types/users";
import { IntegrationSettings } from "@/components/settings/integration-settings";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = (profile?.role as UserRole) ?? "advisor";
  if (role !== "admin") redirect("/pipeline");

  // Fetch connection statuses (never expose tokens to client)
  const { data: tokens } = await supabase
    .from("integration_tokens")
    .select("provider, is_active, token_expires_at, created_at, updated_at")
    .eq("is_active", true);

  const connections: Record<
    string,
    { connected: boolean; expiresAt: string | null; updatedAt: string }
  > = {};

  for (const t of tokens ?? []) {
    connections[t.provider] = {
      connected: t.is_active,
      expiresAt: t.token_expires_at,
      updatedAt: t.updated_at,
    };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cài đặt</h1>
        <p className="text-muted-foreground mt-1">
          Quản lý tích hợp Zalo OA & Facebook Lead Ads
        </p>
      </div>
      <IntegrationSettings connections={connections} />
    </div>
  );
}
