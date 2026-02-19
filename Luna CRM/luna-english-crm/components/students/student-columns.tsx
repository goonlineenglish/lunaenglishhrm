"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { StudentWithLead } from "@/lib/actions/student-actions";
import { StudentStatusBadge } from "./student-status-badge";
import { RenewalCountdown } from "./renewal-countdown";
import { format, parseISO } from "date-fns";

export const studentColumns: ColumnDef<StudentWithLead>[] = [
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
    cell: ({ row }) => <StudentStatusBadge status={row.original.status} />,
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
];
