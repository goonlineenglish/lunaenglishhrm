export interface CSVRow {
  [key: string]: string;
}

function stripBOM(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function splitCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

export function parseCSV(text: string): CSVRow[] {
  const cleaned = stripBOM(text);
  const lines = cleaned.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]);
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCSVLine(lines[i]);
    const row: CSVRow = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? "";
    });
    rows.push(row);
  }

  return rows;
}

const REQUIRED_FIELDS = ["student_name", "current_class", "current_level"];

export interface ValidationError {
  field: string;
  message: string;
}

export function validateStudentRow(row: Record<string, string>): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const field of REQUIRED_FIELDS) {
    if (!row[field] || row[field].trim() === "") {
      errors.push({ field, message: `${field} là bắt buộc` });
    }
  }

  return errors;
}
