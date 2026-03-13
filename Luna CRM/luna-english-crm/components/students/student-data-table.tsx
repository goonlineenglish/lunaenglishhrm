"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import type { StudentWithLead, StudentFilters } from "@/lib/actions/student-actions";
import type { StudentStatus } from "@/lib/types/users";
import type { UserRole } from "@/lib/types/users";
import { buildStudentColumns } from "./student-columns";
import { StudentDetailSheet } from "./student-detail-sheet";
import { StudentBulkActionBar } from "./student-bulk-action-bar";
import { StudentTablePagination } from "./student-table-pagination";
import { StatusChangeConfirmationDialog } from "@/components/shared/status-change-confirmation-dialog";
import { changeStudentStatus } from "@/lib/actions/student-actions";
import { NEEDS_REASON_STATUSES } from "@/lib/constants/student-statuses";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  data: StudentWithLead[];
  onRefresh: () => void;
  onFiltersChange: (filters: StudentFilters) => void;
  userRole?: UserRole;
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

export function StudentDataTable({
  data, onRefresh, onFiltersChange, userRole,
  page, totalPages, totalCount, onPageChange, loading,
}: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<StudentWithLead | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Inline status change state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingChange, setPendingChange] = useState<{ id: string; status: StudentStatus } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const canEdit = userRole !== "marketing";

  // Debounce search: fire onFiltersChange 400ms after typing stops
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onFiltersChange({
        search: value || undefined,
        status: statusFilter !== "all" ? (statusFilter as StudentStatus) : undefined,
      });
    }, 400);
  }, [onFiltersChange, statusFilter]);

  // Cleanup debounce on unmount
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const handleStatusFilterChange = useCallback((value: string) => {
    setStatusFilter(value);
    onFiltersChange({
      search: search || undefined,
      status: value !== "all" ? (value as StudentStatus) : undefined,
    });
  }, [onFiltersChange, search]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.size === data.length ? new Set() : new Set(data.map((s) => s.id))
    );
  }, [data]);

  const handleStatusSelect = useCallback((studentId: string, newStatus: StudentStatus) => {
    if (NEEDS_REASON_STATUSES.includes(newStatus)) {
      setPendingChange({ id: studentId, status: newStatus });
      setConfirmOpen(true);
    } else {
      applyStatusChange(studentId, newStatus);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function applyStatusChange(studentId: string, newStatus: StudentStatus, reason?: string) {
    setConfirmLoading(true);
    try {
      const result = await changeStudentStatus(studentId, newStatus, reason);
      if (result.error) toast.error(result.error);
      else { toast.success("Đã cập nhật trạng thái"); onRefresh(); }
    } catch {
      toast.error("Lỗi cập nhật");
    } finally {
      setConfirmLoading(false);
      setConfirmOpen(false);
      setPendingChange(null);
    }
  }

  // Stable columns: deps are callbacks (memoized) + selectedIds + data.length
  const columns = useMemo(
    () => buildStudentColumns({
      canEdit,
      selectedIds,
      onToggleSelect: toggleSelect,
      onToggleAll: toggleAll,
      totalCount: data.length,
      onStatusSelect: handleStatusSelect,
    }),
    [canEdit, selectedIds, toggleSelect, toggleAll, data.length, handleStatusSelect]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Tìm theo tên, mã HS, SĐT..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
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
      </div>

      {/* Table */}
      <div className={cn("rounded-md border transition-opacity", loading && "opacity-50")}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
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
                  className="cursor-pointer hover:bg-muted/50"
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
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {loading ? "Đang tải..." : "Không có học sinh nào"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <StudentTablePagination
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={onPageChange}
        loading={loading}
      />

      {canEdit && (
        <StudentBulkActionBar
          selectedIds={Array.from(selectedIds)}
          onClearSelection={() => setSelectedIds(new Set())}
          onDone={() => { setSelectedIds(new Set()); onRefresh(); }}
        />
      )}

      <StatusChangeConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Xác nhận chuyển trạng thái"
        description="Vui lòng nhập lý do."
        requireReason
        loading={confirmLoading}
        onConfirm={(reason) => {
          if (pendingChange) applyStatusChange(pendingChange.id, pendingChange.status, reason);
        }}
      />

      <StudentDetailSheet
        student={selectedStudent}
        open={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        onRefresh={onRefresh}
        userRole={userRole}
      />
    </div>
  );
}
