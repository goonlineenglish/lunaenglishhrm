"use client";

import { useState, useCallback } from "react";
import { StudentDataTable } from "@/components/students/student-data-table";
import { CreateStudentDialog } from "@/components/students/create-student-dialog";
import { CSVImportDialog } from "@/components/students/csv-import-dialog";
import { Button } from "@/components/ui/button";
import type { StudentWithLead } from "@/lib/actions/student-actions";
import { getStudents } from "@/lib/actions/student-actions";
import { Plus, Upload } from "lucide-react";

interface Props {
  initialStudents: StudentWithLead[];
  initialCount: number;
}

export function StudentsClient({ initialStudents, initialCount }: Props) {
  const [students, setStudents] = useState(initialStudents);
  const [count, setCount] = useState(initialCount);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const refresh = useCallback(async () => {
    const result = await getStudents();
    setStudents(result.data);
    setCount(result.count);
  }, []);

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

      <StudentDataTable data={students} onRefresh={refresh} />

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
