"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CSVColumnMapper } from "./csv-column-mapper";
import { CSVPreviewTable } from "./csv-preview-table";
import { parseCSV, type CSVRow } from "@/lib/utils/csv-parser";
import { importStudentsCSV } from "@/lib/actions/student-actions";
import { toast } from "sonner";
import { Upload } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

type Step = "upload" | "map" | "preview" | "importing";

export function CSVImportDialog({ open, onClose, onImported }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [csvRows, setCsvRows] = useState<CSVRow[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep("upload");
    setCsvRows([]);
    setCsvHeaders([]);
    setMapping({});
    setImporting(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length === 0) {
        toast.error("File CSV rỗng hoặc không hợp lệ");
        return;
      }
      const headers = Object.keys(rows[0]);
      setCsvRows(rows);
      setCsvHeaders(headers);
      // Auto-map matching headers
      const autoMap: Record<string, string> = {};
      const dbFields = [
        "student_code", "current_class", "current_level",
        "enrollment_date", "level_end_date", "student_name",
      ];
      headers.forEach((h) => {
        const lower = h.toLowerCase().replace(/\s+/g, "_");
        if (dbFields.includes(lower)) {
          autoMap[h] = lower;
        } else {
          autoMap[h] = "__skip__";
        }
      });
      setMapping(autoMap);
      setStep("map");
    };
    reader.readAsText(file, "utf-8");
  }

  function handleNextToPreview() {
    const mappedFields = Object.values(mapping).filter((v) => v !== "__skip__");
    if (!mappedFields.includes("current_class") || !mappedFields.includes("current_level")) {
      toast.error("Cần ghép ít nhất: Lớp và Trình độ");
      return;
    }
    setStep("preview");
  }

  async function handleImport() {
    setImporting(true);
    setStep("importing");

    const importRows = csvRows.map((row) => {
      const mapped: Record<string, string> = {};
      for (const [csvHeader, dbField] of Object.entries(mapping)) {
        if (dbField !== "__skip__") {
          mapped[dbField] = row[csvHeader] ?? "";
        }
      }
      return {
        student_code: mapped.student_code,
        current_class: mapped.current_class ?? "",
        current_level: mapped.current_level ?? "",
        enrollment_date: mapped.enrollment_date || new Date().toISOString().split("T")[0],
        level_end_date: mapped.level_end_date,
      };
    });

    try {
      const result = await importStudentsCSV(importRows);
      if (result.failed > 0) {
        toast.warning(`${result.success} thành công, ${result.failed} lỗi`);
      } else {
        toast.success(`Đã import ${result.success} học sinh`);
      }
      reset();
      onImported();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi import");
      setStep("preview");
    } finally {
      setImporting(false);
    }
  }

  function handleOpenChange(v: boolean) {
    if (!v) {
      reset();
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import học sinh từ CSV</DialogTitle>
          <DialogDescription>
            {step === "upload" && "Tải lên file CSV chứa danh sách học sinh"}
            {step === "map" && "Ghép cột CSV với trường dữ liệu"}
            {step === "preview" && "Xem trước dữ liệu trước khi import"}
            {step === "importing" && "Đang import..."}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Upload className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Chọn file CSV (UTF-8)</p>
            <Input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="max-w-xs"
            />
          </div>
        )}

        {step === "map" && (
          <CSVColumnMapper
            csvHeaders={csvHeaders}
            mapping={mapping}
            onMappingChange={setMapping}
          />
        )}

        {step === "preview" && (
          <CSVPreviewTable rows={csvRows} mapping={mapping} />
        )}

        {step === "importing" && (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">Đang import {csvRows.length} học sinh...</p>
          </div>
        )}

        <DialogFooter>
          {step === "map" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>
                Quay lại
              </Button>
              <Button onClick={handleNextToPreview}>Tiếp tục</Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("map")}>
                Quay lại
              </Button>
              <Button onClick={handleImport} disabled={importing}>
                Import {csvRows.length} dòng
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
