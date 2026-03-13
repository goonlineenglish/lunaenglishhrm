"use client";

import { useState } from "react";
import { restoreStudent } from "@/lib/actions/soft-delete-actions";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface DeletedStudent {
  id: string;
  student_code: string | null;
  full_name: string | null;
  program_type: string | null;
  status: string;
  deleted_at: string;
}

export function DeletedStudentsTable({ data }: { data: DeletedStudent[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const router = useRouter();

  async function handleRestore(id: string) {
    setLoadingId(id);
    const result = await restoreStudent(id);
    setLoadingId(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Đã khôi phục học sinh");
    router.refresh();
  }

  if (data.length === 0) {
    return <p className="text-muted-foreground text-sm py-8 text-center">Không có học sinh nào trong thùng rác.</p>;
  }

  return (
    <div className="rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Mã HS</th>
            <th className="px-3 py-2 text-left font-medium">Họ tên</th>
            <th className="px-3 py-2 text-left font-medium">Chương trình</th>
            <th className="px-3 py-2 text-left font-medium">Trạng thái</th>
            <th className="px-3 py-2 text-left font-medium">Đã xóa</th>
            <th className="px-3 py-2 text-right font-medium">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {data.map((student) => (
            <tr key={student.id} className="border-t">
              <td className="px-3 py-2">{student.student_code ?? "—"}</td>
              <td className="px-3 py-2">{student.full_name ?? "—"}</td>
              <td className="px-3 py-2">{student.program_type ?? "—"}</td>
              <td className="px-3 py-2">{student.status}</td>
              <td className="px-3 py-2 text-muted-foreground">
                {new Date(student.deleted_at).toLocaleDateString("vi-VN")}
              </td>
              <td className="px-3 py-2 text-right">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loadingId === student.id}
                  onClick={() => handleRestore(student.id)}
                >
                  <RotateCcw className="mr-1.5 size-3.5" />
                  {loadingId === student.id ? "Đang..." : "Khôi phục"}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
