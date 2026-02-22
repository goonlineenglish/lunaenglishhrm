"use client";

import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
} from "@tanstack/react-table";
import type { StudentWithLead } from "@/lib/actions/student-actions";
import { studentColumns } from "./student-columns";
import { StudentDetailSheet } from "./student-detail-sheet";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Props {
  data: StudentWithLead[];
  onRefresh: () => void;
}

export function StudentDataTable({ data, onRefresh }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<StudentWithLead | null>(null);

  const filtered = data.filter((s) => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (classFilter !== "all" && s.current_class !== classFilter) return false;
    if (search) {
      const term = search.toLowerCase();
      const name = (s.lead?.student_name ?? s.lead?.parent_name ?? "").toLowerCase();
      const code = (s.student_code ?? "").toLowerCase();
      const phone = (s.lead?.parent_phone ?? "").toLowerCase();
      if (!name.includes(term) && !code.includes(term) && !phone.includes(term)) {
        return false;
      }
    }
    return true;
  });

  const table = useReactTable({
    data: filtered,
    columns: studentColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const classes = [...new Set(data.map((s) => s.current_class).filter(Boolean))] as string[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Tìm theo tên, mã HS, SĐT..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="active">Đang học</SelectItem>
            <SelectItem value="paused">Bảo lưu</SelectItem>
            <SelectItem value="graduated">Tốt nghiệp</SelectItem>
            <SelectItem value="dropped">Nghỉ</SelectItem>
          </SelectContent>
        </Select>
        {classes.length > 0 && (
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Lớp" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả lớp</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedStudent(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={studentColumns.length} className="h-24 text-center">
                  Không có học sinh nào
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground">
        Hiển thị {filtered.length} / {data.length} học sinh
      </p>

      <StudentDetailSheet
        student={selectedStudent}
        open={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        onRefresh={onRefresh}
      />
    </div>
  );
}
