import { Badge } from "@/components/ui/badge";
import type { StudentStatus } from "@/lib/types/users";
import { getStudentStatusConfig } from "@/lib/constants/student-statuses";

export function StudentStatusBadge({ status }: { status: StudentStatus }) {
  const config = getStudentStatusConfig(status);
  return (
    <Badge variant="outline" className={config?.className}>
      {config?.label ?? status}
    </Badge>
  );
}
