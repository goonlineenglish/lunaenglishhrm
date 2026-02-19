import { Badge } from "@/components/ui/badge";
import type { StudentStatus } from "@/lib/types/users";

const STATUS_CONFIG: Record<StudentStatus, { label: string; className: string }> = {
  active: {
    label: "Đang học",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  paused: {
    label: "Bảo lưu",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  graduated: {
    label: "Tốt nghiệp",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  dropped: {
    label: "Nghỉ",
    className: "bg-red-100 text-red-800 border-red-200",
  },
};

export function StudentStatusBadge({ status }: { status: StudentStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
