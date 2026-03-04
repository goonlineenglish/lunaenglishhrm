"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { StudentWithLead } from "@/lib/actions/student-actions";
import type { StudentStatus } from "@/lib/types/users";
import {
  getStudentStatusConfig,
  getValidTransitions,
} from "@/lib/constants/student-statuses";
import { StudentStatusBadge } from "./student-status-badge";
import { RenewalCountdown } from "./renewal-countdown";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS, PROGRAM_CONFIGS } from "@/lib/constants/student-hub-constants";

interface ColumnOptions {
  canEdit: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: () => void;
  totalCount: number;
  onStatusSelect: (studentId: string, newStatus: StudentStatus) => void;
}

export function buildStudentColumns(opts: ColumnOptions): ColumnDef<StudentWithLead>[] {
  const {
    canEdit,
    selectedIds,
    onToggleSelect,
    onToggleAll,
    totalCount,
    onStatusSelect,
  } = opts;

  const cols: ColumnDef<StudentWithLead>[] = [];

  if (canEdit) {
    cols.push({
      id: "select",
      header: () => (
        <Checkbox
          checked={totalCount > 0 && selectedIds.size === totalCount}
          onCheckedChange={onToggleAll}
        />
      ),
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selectedIds.has(row.original.id)}
            onCheckedChange={() => onToggleSelect(row.original.id)}
          />
        </div>
      ),
      size: 40,
    });
  }

  cols.push(
    {
      accessorKey: "student_name",
      header: "Tên học sinh",
      cell: ({ row }) => {
        const lead = row.original.lead;
        const name = lead?.student_name ?? lead?.parent_name ?? "—";
        return <span className="font-medium">{name}</span>;
      },
    },
    {
      accessorKey: "student_code",
      header: "Mã HS",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.student_code ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "current_class",
      header: "Lớp",
      cell: ({ row }) => row.original.current_class ?? "—",
    },
    {
      accessorKey: "current_level",
      header: "Trình độ",
      cell: ({ row }) => row.original.current_level ?? "—",
    },
    {
      accessorKey: "status",
      header: "Trạng thái",
      cell: ({ row }) => {
        const student = row.original;
        if (!canEdit) {
          return <StudentStatusBadge status={student.status} />;
        }
        const config = getStudentStatusConfig(student.status);
        const validTargets = getValidTransitions(student.status);
        // If no valid transitions, render badge only
        if (validTargets.length === 0) {
          return <StudentStatusBadge status={student.status} />;
        }
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Select
              value={student.status}
              onValueChange={(v) => onStatusSelect(student.id, v as StudentStatus)}
            >
              <SelectTrigger className="h-7 w-[140px] text-xs">
                <SelectValue>
                  <span className="flex items-center gap-2">
                    <span className={cn("inline-block size-2 rounded-full", config?.dotColor)} />
                    {config?.label ?? student.status}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {validTargets.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-2">
                      <span className={cn("inline-block size-2 rounded-full", s.dotColor)} />
                      {s.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      },
    },
    {
      accessorKey: "enrollment_date",
      header: "Ngày nhập học",
      cell: ({ row }) => {
        const date = row.original.enrollment_date;
        return date ? format(parseISO(date), "dd/MM/yyyy") : "—";
      },
    },
    {
      accessorKey: "level_end_date",
      header: "Còn lại",
      cell: ({ row }) => (
        <RenewalCountdown levelEndDate={row.original.level_end_date} />
      ),
    },
    {
      accessorKey: "program_type",
      header: "Chương trình",
      cell: ({ row }) => {
        const pt = row.original.program_type;
        return pt ? (PROGRAM_CONFIGS[pt as keyof typeof PROGRAM_CONFIGS]?.label ?? pt) : "—";
      },
    },
    {
      accessorKey: "teacher_name",
      header: "GV phụ trách",
      cell: ({ row }) => row.original.teacher_name ?? "—",
    },
    {
      accessorKey: "payment_status",
      header: "Thanh toán",
      cell: ({ row }) => {
        const ps = row.original.payment_status;
        if (!ps) return <span className="text-muted-foreground">—</span>;
        return (
          <span className={cn("px-2 py-0.5 rounded text-xs font-medium", PAYMENT_STATUS_COLORS[ps as keyof typeof PAYMENT_STATUS_COLORS] ?? "")}>
            {PAYMENT_STATUS_LABELS[ps as keyof typeof PAYMENT_STATUS_LABELS] ?? ps}
          </span>
        );
      },
    },
  );

  return cols;
}

// Keep backward-compat export for any places that still use the old static columns
export const studentColumns: ColumnDef<StudentWithLead>[] = buildStudentColumns({
  canEdit: false,
  selectedIds: new Set(),
  onToggleSelect: () => {},
  onToggleAll: () => {},
  totalCount: 0,
  onStatusSelect: () => {},
});
