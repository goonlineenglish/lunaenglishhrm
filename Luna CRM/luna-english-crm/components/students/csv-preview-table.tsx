"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { validateStudentRow } from "@/lib/utils/csv-parser";

interface Props {
  rows: Record<string, string>[];
  mapping: Record<string, string>;
}

export function CSVPreviewTable({ rows, mapping }: Props) {
  // Build mapped rows
  const mappedRows = rows.map((row) => {
    const mapped: Record<string, string> = {};
    for (const [csvHeader, dbField] of Object.entries(mapping)) {
      if (dbField !== "__skip__") {
        mapped[dbField] = row[csvHeader] ?? "";
      }
    }
    return mapped;
  });

  const dbFields = [...new Set(Object.values(mapping).filter((v) => v !== "__skip__"))];
  const previewRows = mappedRows.slice(0, 10);

  const FIELD_LABELS: Record<string, string> = {
    student_code: "Mã HS",
    current_class: "Lớp",
    current_level: "Trình độ",
    enrollment_date: "Ngày nhập học",
    level_end_date: "Hết hạn level",
    student_name: "Tên HS",
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Xem trước {previewRows.length} / {mappedRows.length} dòng
      </p>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              {dbFields.map((f) => (
                <TableHead key={f}>{FIELD_LABELS[f] ?? f}</TableHead>
              ))}
              <TableHead>Hợp lệ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewRows.map((row, idx) => {
              const errors = validateStudentRow(row);
              const hasErrors = errors.length > 0;
              return (
                <TableRow key={idx} className={hasErrors ? "bg-red-50" : ""}>
                  <TableCell>{idx + 1}</TableCell>
                  {dbFields.map((f) => (
                    <TableCell key={f}>{row[f] ?? "—"}</TableCell>
                  ))}
                  <TableCell>
                    {hasErrors ? (
                      <span className="text-red-600 text-xs">
                        {errors.map((e) => e.message).join(", ")}
                      </span>
                    ) : (
                      <span className="text-green-600 text-xs">OK</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
