"use client";

import { useState } from "react";
import { restoreLead } from "@/lib/actions/lead-actions";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface DeletedLead {
  id: string;
  student_name: string | null;
  parent_name: string;
  parent_phone: string | null;
  current_stage: string;
  deleted_at: string;
}

export function DeletedLeadsTable({ data }: { data: DeletedLead[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const router = useRouter();

  async function handleRestore(id: string) {
    setLoadingId(id);
    const result = await restoreLead(id);
    setLoadingId(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Đã khôi phục lead");
    router.refresh();
  }

  if (data.length === 0) {
    return <p className="text-muted-foreground text-sm py-8 text-center">Không có lead nào trong thùng rác.</p>;
  }

  return (
    <div className="rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Tên HS</th>
            <th className="px-3 py-2 text-left font-medium">Phụ huynh</th>
            <th className="px-3 py-2 text-left font-medium">SĐT</th>
            <th className="px-3 py-2 text-left font-medium">Giai đoạn</th>
            <th className="px-3 py-2 text-left font-medium">Đã xóa</th>
            <th className="px-3 py-2 text-right font-medium">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {data.map((lead) => (
            <tr key={lead.id} className="border-t">
              <td className="px-3 py-2">{lead.student_name ?? "—"}</td>
              <td className="px-3 py-2">{lead.parent_name}</td>
              <td className="px-3 py-2">{lead.parent_phone ?? "—"}</td>
              <td className="px-3 py-2">{lead.current_stage}</td>
              <td className="px-3 py-2 text-muted-foreground">
                {new Date(lead.deleted_at).toLocaleDateString("vi-VN")}
              </td>
              <td className="px-3 py-2 text-right">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loadingId === lead.id}
                  onClick={() => handleRestore(lead.id)}
                >
                  <RotateCcw className="mr-1.5 size-3.5" />
                  {loadingId === lead.id ? "Đang..." : "Khôi phục"}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
