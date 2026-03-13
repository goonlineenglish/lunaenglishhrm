'use client'

/**
 * Branches management page — admin only.
 * Lists branches with create/edit dialogs.
 * URL: /branches
 */

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { getBranches, createBranch, updateBranch } from '@/lib/actions/branch-actions'
import type { Branch } from '@/lib/types/database'

interface BranchFormState {
  name: string
  address: string
  phone: string
  is_active: boolean
}

const DEFAULT_FORM: BranchFormState = { name: '', address: '', phone: '', is_active: true }

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editBranch, setEditBranch] = useState<Branch | null>(null)
  const [form, setForm] = useState<BranchFormState>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchBranches = useCallback(async () => {
    setLoading(true)
    const result = await getBranches()
    if (result.success) setBranches(result.data ?? [])
    else setError(result.error ?? 'Lỗi tải dữ liệu.')
    setLoading(false)
  }, [])

  useEffect(() => { fetchBranches() }, [fetchBranches])

  function openCreate() {
    setEditBranch(null)
    setForm(DEFAULT_FORM)
    setFormError(null)
    setDialogOpen(true)
  }

  function openEdit(branch: Branch) {
    setEditBranch(branch)
    setForm({ name: branch.name, address: branch.address ?? '', phone: branch.phone ?? '', is_active: branch.is_active })
    setFormError(null)
    setDialogOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return setFormError('Tên chi nhánh là bắt buộc.')
    setSaving(true)
    setFormError(null)

    const payload = { name: form.name.trim(), address: form.address || null, phone: form.phone || null, is_active: form.is_active, manager_id: null }

    const result = editBranch
      ? await updateBranch(editBranch.id, payload)
      : await createBranch(payload)

    if (!result.success) {
      setFormError(result.error ?? 'Lỗi lưu chi nhánh.')
      setSaving(false)
      return
    }

    setSaving(false)
    setDialogOpen(false)
    fetchBranches()
  }

  if (loading) return <LoadingSpinner />
  if (error) return <Alert variant="destructive"><p>{error}</p></Alert>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          <h1 className="text-xl font-bold">Chi nhánh</h1>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Thêm chi nhánh
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên chi nhánh</TableHead>
              <TableHead>Địa chỉ</TableHead>
              <TableHead>Điện thoại</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-20">Sửa</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {branches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Chưa có chi nhánh nào.
                </TableCell>
              </TableRow>
            ) : (
              branches.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{b.address ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{b.phone ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={b.is_active ? 'default' : 'secondary'}>
                      {b.is_active ? 'Hoạt động' : 'Ngừng'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(b)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editBranch ? 'Sửa chi nhánh' : 'Thêm chi nhánh'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-2">
            {formError && <Alert variant="destructive"><p className="text-sm">{formError}</p></Alert>}
            <div className="space-y-1">
              <Label htmlFor="name">Tên chi nhánh *</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Luna English — Quận 1" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="address">Địa chỉ</Label>
              <Input id="address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="123 Nguyễn Huệ, Q1, TP.HCM" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Điện thoại</Label>
              <Input id="phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="028 1234 5678" />
            </div>
            {editBranch && (
              <div className="flex items-center gap-2">
                <input
                  id="is_active"
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="is_active" className="cursor-pointer">Đang hoạt động</Label>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Hủy</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
