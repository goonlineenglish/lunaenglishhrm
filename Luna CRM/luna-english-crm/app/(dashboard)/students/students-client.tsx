"use client";

import { useState, useCallback, useTransition } from "react";
import { StudentDataTable } from "@/components/students/student-data-table";
import { CreateStudentDialog } from "@/components/students/create-student-dialog";
import { CSVImportDialog } from "@/components/students/csv-import-dialog";
import { Button } from "@/components/ui/button";
import type { StudentWithLead } from "@/lib/actions/student-actions";
import { getStudents } from "@/lib/actions/student-actions";
import type { StudentFilters } from "@/lib/actions/student-actions";
import type { UserRole } from "@/lib/types/users";
import { Plus, Upload } from "lucide-react";
import { toast } from "sonner";

interface Props {
  initialStudents: StudentWithLead[];
  initialCount: number;
  userRole: UserRole;
}

const PAGE_SIZE = 20;

export function StudentsClient({ initialStudents, initialCount, userRole }: Props) {
  const [students, setStudents] = useState(initialStudents);
  const [count, setCount] = useState(initialCount);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  // Current filters (persisted so pagination keeps them)
  const [filters, setFilters] = useState<StudentFilters>({});

  const fetchPage = useCallback(async (newPage: number, newFilters?: StudentFilters) => {
    const f = newFilters ?? filters;
    const result = await getStudents({ ...f, page: newPage, pageSize: PAGE_SIZE });
    if (result.error) {
      toast.error(result.error);
    }
    setStudents(result.data);
    setCount(result.count);
    setPage(newPage);
    if (newFilters) setFilters(newFilters);
  }, [filters]);

  const handleFiltersChange = useCallback((newFilters: StudentFilters) => {
    startTransition(() => {
      fetchPage(1, newFilters);
    });
  }, [fetchPage]);

  const handlePageChange = useCallback((newPage: number) => {
    startTransition(() => {
      fetchPage(newPage);
    });
  }, [fetchPage]);

  const refresh = useCallback(() => {
    startTransition(() => {
      fetchPage(page);
    });
  }, [fetchPage, page]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Học sinh</h1>
          <p className="text-muted-foreground mt-1">
            {count} học sinh trong hệ thống
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Thêm học sinh
          </Button>
        </div>
      </div>

      <StudentDataTable
        data={students}
        onRefresh={refresh}
        onFiltersChange={handleFiltersChange}
        userRole={userRole}
        page={page}
        totalPages={totalPages}
        totalCount={count}
        onPageChange={handlePageChange}
        loading={isPending}
      />

      <CreateStudentDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={refresh}
      />

      <CSVImportDialog
        open={showImport}
        onClose={() => setShowImport(false)}
        onImported={refresh}
      />
    </div>
  );
}
