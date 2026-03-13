'use client'

/**
 * Employee extended profile info — 4 sections: personal, work, bank, qualifications.
 * Edit mode for admin/BM; read-only for employee.
 */

import { useState } from 'react'
import { Pencil, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { updateEmployeeProfile } from '@/lib/actions/employee-profile-actions'
import type { Employee } from '@/lib/types/database-core-types'
import type { UserRole } from '@/lib/types/database-core-types'

interface Props {
  employee: Employee
  viewerRole: UserRole
  onUpdated: () => void
}

type ProfileFields = {
  date_of_birth: string
  id_number: string
  id_issue_date: string
  id_issue_place: string
  address: string
  emergency_contact: string
  bank_account_number: string
  bank_name: string
  nationality: string
  qualifications: string
  teaching_license: string
  characteristics: string
  phone: string
}

function toForm(e: Employee): ProfileFields {
  return {
    date_of_birth: e.date_of_birth ?? '',
    id_number: e.id_number ?? '',
    id_issue_date: e.id_issue_date ?? '',
    id_issue_place: e.id_issue_place ?? '',
    address: e.address ?? '',
    emergency_contact: e.emergency_contact ?? '',
    bank_account_number: e.bank_account_number ?? '',
    bank_name: e.bank_name ?? '',
    nationality: e.nationality ?? '',
    qualifications: e.qualifications ?? '',
    teaching_license: e.teaching_license ?? '',
    characteristics: e.characteristics ?? '',
    phone: e.phone ?? '',
  }
}

export function EmployeeProfileInfo({ employee, viewerRole, onUpdated }: Props) {
  const canEdit = viewerRole === 'admin' || viewerRole === 'branch_manager'
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<ProfileFields>(() => toForm(employee))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(k: keyof ProfileFields, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  async function handleSave() {
    setError(null)
    setLoading(true)
    try {
      const result = await updateEmployeeProfile(employee.id, {
        phone: form.phone || null,
        date_of_birth: form.date_of_birth || null,
        id_number: form.id_number || null,
        id_issue_date: form.id_issue_date || null,
        id_issue_place: form.id_issue_place || null,
        address: form.address || null,
        emergency_contact: form.emergency_contact || null,
        bank_account_number: form.bank_account_number || null,
        bank_name: form.bank_name || null,
        nationality: form.nationality || null,
        qualifications: form.qualifications || null,
        teaching_license: form.teaching_license || null,
        characteristics: form.characteristics || null,
      })
      if (!result.success) return setError(result.error ?? 'Lỗi cập nhật.')
      setEditing(false)
      onUpdated()
    } finally {
      setLoading(false)
    }
  }

  function Field({ label, fkey }: { label: string; fkey: keyof ProfileFields }) {
    if (!editing) {
      return (
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-medium mt-0.5 text-sm">{form[fkey] || '—'}</p>
        </div>
      )
    }
    return (
      <div className="space-y-1">
        <Label className="text-xs">{label}</Label>
        <Input
          value={form[fkey]}
          onChange={(e) => set(fkey, e.target.value)}
          className="h-8 text-sm"
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && <Alert variant="destructive"><p className="text-sm">{error}</p></Alert>}

      {canEdit && (
        <div className="flex justify-end gap-2">
          {editing ? (
            <>
              <Button size="sm" variant="outline" onClick={() => { setEditing(false); setForm(toForm(employee)) }} disabled={loading}>
                <X className="h-3.5 w-3.5 mr-1" /> Hủy
              </Button>
              <Button size="sm" onClick={handleSave} disabled={loading}>
                <Save className="h-3.5 w-3.5 mr-1" /> {loading ? 'Lưu...' : 'Lưu'}
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Sửa hồ sơ
            </Button>
          )}
        </div>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Thông tin cá nhân</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <Field label="Ngày sinh" fkey="date_of_birth" />
          <Field label="Số điện thoại" fkey="phone" />
          <Field label="CCCD/Hộ chiếu" fkey="id_number" />
          <Field label="Ngày cấp" fkey="id_issue_date" />
          <Field label="Nơi cấp" fkey="id_issue_place" />
          <Field label="Quốc tịch" fkey="nationality" />
          <div className="col-span-2"><Field label="Địa chỉ" fkey="address" /></div>
          <div className="col-span-2"><Field label="Liên lạc khẩn cấp" fkey="emergency_contact" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Ngân hàng</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <Field label="Tên ngân hàng" fkey="bank_name" />
          <Field label="Số tài khoản" fkey="bank_account_number" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Trình độ & Đặc tính</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 text-sm">
          <Field label="Bằng cấp / Trình độ" fkey="qualifications" />
          <Field label="Chứng chỉ giảng dạy" fkey="teaching_license" />
          <Field label="Đặc tính cá nhân" fkey="characteristics" />
        </CardContent>
      </Card>
    </div>
  )
}
