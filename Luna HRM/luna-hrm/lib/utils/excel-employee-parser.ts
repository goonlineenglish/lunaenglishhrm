/**
 * Parse .xlsx file into ParsedEmployee array for bulk employee import.
 * Required columns: Mã NV (0), Họ tên (1), Email (2), Vị trí (4)
 * Optional columns: SĐT (3), Vai trò (5), Lương/buổi (6), Lương thay (7), HĐLĐ (8),
 *   Người PT (9), Ngày vào (10), CCCD (11), Ngày cấp (12), Nơi cấp (13), Ngày sinh (14),
 *   Địa chỉ (15), Liên hệ KC (16), STK (17), Ngân hàng (18), Quốc tịch (19),
 *   Bằng cấp (20), Chứng chỉ GD (21), Đặc điểm (22)
 */

import * as XLSX from 'xlsx'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParsedEmployee {
  employee_code: string
  full_name: string
  email: string
  phone: string | null
  position: string
  role: string
  rate_per_session: number
  sub_rate: number
  has_labor_contract: boolean
  dependent_count: number
  join_date: string | null
  id_number: string | null
  id_issue_date: string | null
  id_issue_place: string | null
  date_of_birth: string | null
  address: string | null
  emergency_contact: string | null
  bank_account_number: string | null
  bank_name: string | null
  nationality: string | null
  qualifications: string | null
  teaching_license: string | null
  characteristics: string | null
}

export interface EmployeeParseResult {
  valid: ParsedEmployee[]
  errors: { row: number; message: string }[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_POSITIONS = new Set(['teacher', 'assistant', 'office', 'admin'])
const VALID_ROLES = new Set(['admin', 'branch_manager', 'accountant', 'employee'])

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse date string (multiple formats) to YYYY-MM-DD or null */
function parseDate(raw: string): string | null {
  if (!raw.trim()) return null
  // Try DD/MM/YYYY
  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
  // Try YYYY-MM-DD
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return raw
  return null
}

/** Parse boolean from Vietnamese text */
function parseBool(raw: string): boolean {
  return ['c', 'có', 'true', '1', 'yes'].includes(raw.trim().toLowerCase())
}

// ─── Main parser ──────────────────────────────────────────────────────────────

/**
 * Parse an ArrayBuffer from a .xlsx/.xls file.
 * First row is treated as header and skipped.
 * Returns valid rows and per-row errors.
 */
export function parseEmployeeExcel(file: ArrayBuffer): EmployeeParseResult {
  try {
    const workbook = XLSX.read(file, { type: 'array' })
    if (!workbook.SheetNames.length) {
      return { valid: [], errors: [{ row: 0, message: 'File Excel trống hoặc không hợp lệ.' }] }
    }
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    if (!sheet) return { valid: [], errors: [{ row: 0, message: 'Không tìm thấy sheet dữ liệu.' }] }

    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      defval: '',
      raw: false,
    }) as string[][]

    const valid: ParsedEmployee[] = []
    const errors: { row: number; message: string }[] = []
    const seenCodes = new Set<string>()
    const seenEmails = new Set<string>()

    // Skip header row (index 0), process from index 1 (Excel row 2)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      const excelRow = i + 1
      if (!row || row.every((c) => !String(c).trim())) continue

      const str = (idx: number) => String(row[idx] ?? '').trim()

      const employee_code = str(0)
      const full_name = str(1)
      const email = str(2)
      const phone = str(3) || null
      const position = str(4).toLowerCase()
      const role = str(5).toLowerCase() || 'employee'

      // Required field validation
      if (!employee_code) { errors.push({ row: excelRow, message: 'Thiếu mã nhân viên.' }); continue }
      if (!full_name) { errors.push({ row: excelRow, message: 'Thiếu họ tên.' }); continue }
      if (!email) { errors.push({ row: excelRow, message: 'Thiếu email.' }); continue }
      // Basic email format: requires local@domain.tld
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { errors.push({ row: excelRow, message: `Email không hợp lệ: "${email}".` }); continue }
      if (!position) { errors.push({ row: excelRow, message: 'Thiếu vị trí.' }); continue }
      if (!VALID_POSITIONS.has(position)) {
        errors.push({ row: excelRow, message: `Vị trí không hợp lệ: "${position}". Dùng: teacher, assistant, office, admin.` })
        continue
      }
      if (!VALID_ROLES.has(role)) {
        errors.push({ row: excelRow, message: `Vai trò không hợp lệ: "${role}". Dùng: admin, branch_manager, accountant, employee.` })
        continue
      }

      // In-file duplicate detection
      if (seenCodes.has(employee_code)) {
        errors.push({ row: excelRow, message: `Mã NV trùng lặp trong file: "${employee_code}".` })
        continue
      }
      if (seenEmails.has(email.toLowerCase())) {
        errors.push({ row: excelRow, message: `Email trùng lặp trong file: "${email}".` })
        continue
      }
      seenCodes.add(employee_code)
      seenEmails.add(email.toLowerCase())

      valid.push({
        employee_code,
        full_name,
        email,
        phone,
        position,
        role,
        rate_per_session: parseFloat(str(6)) || 0,
        sub_rate: parseFloat(str(7)) || 0,
        has_labor_contract: parseBool(str(8)),
        dependent_count: parseInt(str(9), 10) || 0,
        join_date: parseDate(str(10)),
        id_number: str(11) || null,
        id_issue_date: parseDate(str(12)),
        id_issue_place: str(13) || null,
        date_of_birth: parseDate(str(14)),
        address: str(15) || null,
        emergency_contact: str(16) || null,
        bank_account_number: str(17) || null,
        bank_name: str(18) || null,
        nationality: str(19) || null,
        qualifications: str(20) || null,
        teaching_license: str(21) || null,
        characteristics: str(22) || null,
      })
    }

    return { valid, errors }
  } catch {
    return { valid: [], errors: [{ row: 0, message: 'File không phải định dạng Excel hợp lệ.' }] }
  }
}

// ─── Template generator ───────────────────────────────────────────────────────

/** Generate downloadable .xlsx template with headers + sample row */
export function generateEmployeeTemplate(): ArrayBuffer {
  const headers = [
    'Mã NV', 'Họ tên', 'Email', 'SĐT', 'Vị trí', 'Vai trò',
    'Lương/buổi', 'Lương thay', 'HĐLĐ (C/K)', 'Người PT', 'Ngày vào (DD/MM/YYYY)',
    'CCCD', 'Ngày cấp CCCD', 'Nơi cấp CCCD', 'Ngày sinh (DD/MM/YYYY)',
    'Địa chỉ', 'Liên hệ KC', 'STK', 'Ngân hàng',
    'Quốc tịch', 'Bằng cấp', 'Chứng chỉ GD', 'Đặc điểm',
  ]
  const sampleRow = [
    'T-TM02', 'Nguyễn Văn B', 'nguyen.b@example.com', '0901234567',
    'teacher', 'employee', '150000', '100000', 'K', '0', '15/03/2026',
    '001234567890', '01/01/2020', 'Hà Nội', '15/05/1990',
    '123 Đường ABC', '0987654321', '1234567890', 'Vietcombank',
    'Việt Nam', 'Cử nhân Sư phạm Tiếng Anh', 'IELTS 7.0', '',
  ]

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow])
  // Auto column widths based on header length
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 2, 12) }))
  XLSX.utils.book_append_sheet(wb, ws, 'Nhân viên')
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
}
