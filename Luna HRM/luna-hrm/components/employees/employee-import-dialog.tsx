'use client'

/**
 * Dialog for bulk importing employees from .xlsx file.
 * Admin: must select target branch via dropdown.
 * BM: auto-uses own branch (no dropdown shown).
 * Sends valid rows in chunks of 30 with progress indicator.
 */

import { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Alert } from '@/components/ui/alert'
import {
  parseEmployeeExcel,
  generateEmployeeTemplate,
  type EmployeeParseResult,
  type ParsedEmployee,
} from '@/lib/utils/excel-employee-parser'
import { batchImportEmployees } from '@/lib/actions/employee-import-actions'
import type { Branch } from '@/lib/types/database'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  branches: Branch[]
  userBranchId: string | null
  userRole: string
  onImported: () => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE_MB = 2
const MAX_ROWS = 200
const CHUNK_SIZE = 30

// ─── Valid rows preview table ─────────────────────────────────────────────────

function ValidTable({ rows }: { rows: ParsedEmployee[] }) {
  if (rows.length === 0) return null
  return (
    <div className="overflow-auto max-h-40 text-xs border rounded">
      <table className="w-full">
        <thead className="bg-muted sticky top-0">
          <tr>
            {['Mã NV', 'Họ tên', 'Email', 'Vị trí', 'Vai trò'].map((h) => (
              <th key={h} className="px-2 py-1 text-left font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-green-100 bg-green-50/40">
              <td className="px-2 py-1 font-mono">{r.employee_code}</td>
              <td className="px-2 py-1">{r.full_name}</td>
              <td className="px-2 py-1 text-muted-foreground">{r.email}</td>
              <td className="px-2 py-1">{r.position}</td>
              <td className="px-2 py-1">{r.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main dialog ──────────────────────────────────────────────────────────────

export function EmployeeImportDialog({
  open, onOpenChange, branches, userBranchId, userRole, onImported,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [parseResult, setParseResult] = useState<EmployeeParseResult | null>(null)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [importErrors, setImportErrors] = useState<{ employee_code: string; message: string }[]>([])
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [selectedBranchId, setSelectedBranchId] = useState<string>('')

  const isAdmin = userRole === 'admin'
  const effectiveBranchId = isAdmin ? selectedBranchId : (userBranchId ?? '')

  function reset() {
    setParseResult(null)
    setImportErrors([])
    setSuccessMsg(null)
    setProgress(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleClose(val: boolean) {
    if (!importing) { reset(); onOpenChange(val) }
  }

  function handleDownloadTemplate() {
    const buf = generateEmployeeTemplate()
    const blob = new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mau-nhap-nhan-vien.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    reset()

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setImportErrors([{ employee_code: '', message: `File vượt quá ${MAX_FILE_SIZE_MB}MB.` }])
      return
    }

    const buf = await file.arrayBuffer()
    const result = parseEmployeeExcel(buf)

    if (result.valid.length > MAX_ROWS) {
      setImportErrors([{ employee_code: '', message: `Tối đa ${MAX_ROWS} nhân viên mỗi lần nhập.` }])
      return
    }

    setParseResult(result)
  }

  async function handleImport() {
    if (!parseResult || parseResult.valid.length === 0) return
    if (!effectiveBranchId) return

    setImporting(true)
    setImportErrors([])
    setSuccessMsg(null)

    const rows = parseResult.valid
    const chunks: ParsedEmployee[][] = []
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      chunks.push(rows.slice(i, i + CHUNK_SIZE))
    }

    let totalImported = 0
    const allErrors: { employee_code: string; message: string }[] = []

    for (let i = 0; i < chunks.length; i++) {
      setProgress({ current: i * CHUNK_SIZE, total: rows.length })
      const result = await batchImportEmployees(chunks[i], effectiveBranchId)
      totalImported += result.imported_count
      allErrors.push(...result.errors)
    }

    setProgress(null)
    setImporting(false)

    if (allErrors.length > 0) setImportErrors(allErrors)
    if (totalImported > 0) {
      setSuccessMsg(`Đã nhập ${totalImported} nhân viên thành công. Mật khẩu mặc định: Luna@2026 (yêu cầu đổi ngay sau khi đăng nhập).`)
      onImported()
    }
  }

  const validCount = parseResult?.valid.length ?? 0
  const parseErrors = parseResult?.errors ?? []
  const canImport = validCount > 0 && !!effectiveBranchId && !importing

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Nhập nhân viên từ Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Admin: branch selector */}
          {isAdmin && (
            <div>
              <label className="text-sm font-medium mb-1 block">Chi nhánh</label>
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn chi nhánh để nhập..." />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Template download + file picker */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground flex-1">
                File Excel cần 4 cột bắt buộc: Mã NV, Họ tên, Email, Vị trí
              </p>
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate} type="button">
                <Download className="h-3.5 w-3.5 mr-1" />
                Tải template
              </Button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="block text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:bg-primary file:text-primary-foreground cursor-pointer"
            />
          </div>

          {/* Import progress */}
          {progress && (
            <div className="text-sm text-muted-foreground">
              Đang nhập... {Math.min(progress.current + CHUNK_SIZE, progress.total)}/{progress.total} nhân viên
            </div>
          )}

          {/* Success message */}
          {successMsg && (
            <Alert className="border-green-300 bg-green-50 text-green-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <p className="text-sm">{successMsg}</p>
            </Alert>
          )}

          {/* Valid rows preview */}
          {validCount > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-green-700">{validCount} nhân viên hợp lệ:</p>
              <ValidTable rows={parseResult!.valid} />
            </div>
          )}

          {/* Parse errors */}
          {parseErrors.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {parseErrors.length} dòng lỗi định dạng:
              </p>
              <ul className="text-xs text-destructive space-y-0.5 max-h-28 overflow-auto border rounded p-2">
                {parseErrors.map((e, i) => (
                  <li key={i}>Dòng {e.row}: {e.message}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Server-side import errors */}
          {importErrors.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-destructive">Lỗi khi nhập:</p>
              <ul className="text-xs text-destructive space-y-0.5 max-h-28 overflow-auto border rounded p-2">
                {importErrors.map((e, i) => (
                  <li key={i}>{e.employee_code ? `[${e.employee_code}] ` : ''}{e.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={importing}>
            Hủy
          </Button>
          <Button onClick={handleImport} disabled={!canImport}>
            <Upload className="h-4 w-4 mr-1" />
            {importing ? 'Đang nhập...' : `Nhập ${validCount} nhân viên`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
