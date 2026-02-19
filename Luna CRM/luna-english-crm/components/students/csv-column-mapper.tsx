"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const DB_FIELDS = [
  { value: "__skip__", label: "— Bỏ qua —" },
  { value: "student_code", label: "Mã học sinh" },
  { value: "current_class", label: "Lớp" },
  { value: "current_level", label: "Trình độ" },
  { value: "enrollment_date", label: "Ngày nhập học" },
  { value: "level_end_date", label: "Ngày hết hạn level" },
  { value: "student_name", label: "Tên học sinh" },
];

interface Props {
  csvHeaders: string[];
  mapping: Record<string, string>;
  onMappingChange: (mapping: Record<string, string>) => void;
}

export function CSVColumnMapper({ csvHeaders, mapping, onMappingChange }: Props) {
  function handleChange(csvHeader: string, dbField: string) {
    onMappingChange({ ...mapping, [csvHeader]: dbField });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Ghép cột CSV với trường dữ liệu tương ứng
      </p>
      {csvHeaders.map((header) => (
        <div key={header} className="flex items-center gap-3">
          <Label className="w-1/3 text-sm truncate" title={header}>
            {header}
          </Label>
          <Select
            value={mapping[header] ?? "__skip__"}
            onValueChange={(v) => handleChange(header, v)}
          >
            <SelectTrigger className="w-2/3">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DB_FIELDS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}
