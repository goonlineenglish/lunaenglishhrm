"use client";

import { useState } from "react";
import { restoreActivity } from "@/lib/actions/soft-delete-actions";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface DeletedActivity {
  id: string;
  lead_id: string;
  type: string;
  title: string | null;
  content: string | null;
  deleted_at: string;
}

export function DeletedActivitiesTable({ data }: { data: DeletedActivity[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const router = useRouter();

  async function handleRestore(id: string) {
    setLoadingId(id);
    const result = await restoreActivity(id);
    setLoadingId(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Đã khôi phục hoạt động");
    router.refresh();
  }

  if (data.length === 0) {
    return <p className="text-muted-foreground text-sm py-8 text-center">Không có hoạt động nào trong thùng rác.</p>;
  }

  return (
    <div className="rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Loại</th>
            <th className="px-3 py-2 text-left font-medium">Tiêu đề</th>
            <th className="px-3 py-2 text-left font-medium">Nội dung</th>
            <th className="px-3 py-2 text-left font-medium">Đã xóa</th>
            <th className="px-3 py-2 text-right font-medium">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {data.map((activity) => (
            <tr key={activity.id} className="border-t">
              <td className="px-3 py-2">{activity.type}</td>
              <td className="px-3 py-2">{activity.title ?? "—"}</td>
              <td className="px-3 py-2 max-w-[200px] truncate">
                {activity.content ?? "—"}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {new Date(activity.deleted_at).toLocaleDateString("vi-VN")}
              </td>
              <td className="px-3 py-2 text-right">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loadingId === activity.id}
                  onClick={() => handleRestore(activity.id)}
                >
                  <RotateCcw className="mr-1.5 size-3.5" />
                  {loadingId === activity.id ? "Đang..." : "Khôi phục"}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
