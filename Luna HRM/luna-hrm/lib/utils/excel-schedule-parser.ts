/**
 * Parse .xlsx file into ParsedSchedule array for class schedule batch import.
 * Expected columns: Mã lớp | Tên lớp | Ca học | Ngày học | Mã GV | Mã TG
 */

import * as XLSX from 'xlsx'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParsedSchedule {
  class_code: string
  class_name: string
  shift_time: string
  days_of_week: string[]   // e.g. ['T2','T4','T6']
  teacher_code: string
  assistant_code: string
}

export interface ParseResult {
  valid: ParsedSchedule[]
  errors: { row: number; message: string }[]
}

// ─── Valid day codes ──────────────────────────────────────────────────────────

const VALID_DAYS = new Set(['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'])

function parseDays(raw: string): string[] | null {
  const parts = raw
    .split(/[,\s\/]+/)
    .map((d) => d.trim().toUpperCase())
    .filter(Boolean)

  if (parts.length === 0) return null
  for (const p of parts) {
    if (!VALID_DAYS.has(p)) return null
  }
  return parts
}

// ─── Main parser ──────────────────────────────────────────────────────────────

/**
 * Parse an ArrayBuffer from a .xlsx/.xls file.
 * First row is treated as header and skipped.
 * Returns valid rows and per-row errors.
 */
export function parseScheduleExcel(file: ArrayBuffer): ParseResult {
  try {
    const workbook = XLSX.read(file, { type: 'array' })

    if (!workbook.SheetNames.length) {
      return { valid: [], errors: [{ row: 0, message: 'File Excel trống hoặc không hợp lệ.' }] }
    }

    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) {
      return { valid: [], errors: [{ row: 0, message: 'Không tìm thấy sheet dữ liệu.' }] }
    }

    // Convert to array of arrays (raw values)
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      defval: '',
      raw: false,
    }) as string[][]

  const valid: ParsedSchedule[] = []
  const errors: { row: number; message: string }[] = []

  // Skip header row (index 0), process from row index 1 (Excel row 2)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const excelRow = i + 1

    // Skip completely empty rows
    if (!row || row.every((cell) => !String(cell).trim())) continue

    const class_code = String(row[0] ?? '').trim()
    const class_name = String(row[1] ?? '').trim()
    const shift_time = String(row[2] ?? '').trim()
    const days_raw = String(row[3] ?? '').trim()
    const teacher_code = String(row[4] ?? '').trim()
    const assistant_code = String(row[5] ?? '').trim()

    if (!class_code) {
      errors.push({ row: excelRow, message: 'Thiếu mã lớp.' })
      continue
    }
    if (!class_name) {
      errors.push({ row: excelRow, message: 'Thiếu tên lớp.' })
      continue
    }
    if (!shift_time) {
      errors.push({ row: excelRow, message: 'Thiếu ca học.' })
      continue
    }
    if (!days_raw) {
      errors.push({ row: excelRow, message: 'Thiếu ngày học.' })
      continue
    }

    const days = parseDays(days_raw)
    if (!days) {
      errors.push({ row: excelRow, message: `Ngày học không hợp lệ: "${days_raw}". Dùng T2-T7 hoặc CN.` })
      continue
    }
    if (!teacher_code) {
      errors.push({ row: excelRow, message: 'Thiếu mã giáo viên.' })
      continue
    }
    if (!assistant_code) {
      errors.push({ row: excelRow, message: 'Thiếu mã trợ giảng.' })
      continue
    }

    valid.push({ class_code, class_name, shift_time, days_of_week: days, teacher_code, assistant_code })
  }

  return { valid, errors }
  } catch {
    return { valid: [], errors: [{ row: 0, message: 'File không phải định dạng Excel hợp lệ.' }] }
  }
}
