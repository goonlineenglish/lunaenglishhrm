import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeletedLeadsTable } from "@/components/trash/deleted-leads-table";
import { DeletedStudentsTable } from "@/components/trash/deleted-students-table";
import { DeletedActivitiesTable } from "@/components/trash/deleted-activities-table";
import {
  getDeletedLeads,
  getDeletedStudents,
  getDeletedActivities,
} from "@/lib/actions/soft-delete-actions";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { UserRole } from "@/lib/types/users";

export default async function TrashPage() {
  // Admin-only page guard (same pattern as /settings)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = (profile?.role as UserRole) ?? "advisor";
  if (role !== "admin") redirect("/pipeline");

  const [leadsRes, studentsRes, activitiesRes] = await Promise.all([
    getDeletedLeads(),
    getDeletedStudents(),
    getDeletedActivities(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Thùng rác</h1>
        <p className="text-muted-foreground text-sm">
          Các bản ghi đã xóa. Chỉ admin mới có thể khôi phục.
        </p>
      </div>

      <Tabs defaultValue="leads">
        <TabsList>
          <TabsTrigger value="leads">
            Leads ({leadsRes.data?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="students">
            Học sinh ({studentsRes.data?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="activities">
            Hoạt động ({activitiesRes.data?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="mt-4">
          <DeletedLeadsTable data={leadsRes.data ?? []} />
        </TabsContent>
        <TabsContent value="students" className="mt-4">
          <DeletedStudentsTable data={studentsRes.data ?? []} />
        </TabsContent>
        <TabsContent value="activities" className="mt-4">
          <DeletedActivitiesTable data={activitiesRes.data ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
