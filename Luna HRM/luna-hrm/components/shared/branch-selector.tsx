'use client'

/**
 * Branch selector dropdown for admin users.
 * BM always sees their own branch only (hidden).
 */

import { useEffect, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getBranches } from '@/lib/actions/branch-actions'
import type { Branch } from '@/lib/types/database'

interface Props {
  value: string
  onChange: (branchId: string) => void
  placeholder?: string
}

export function BranchSelector({ value, onChange, placeholder = 'Chọn chi nhánh' }: Props) {
  const [branches, setBranches] = useState<Branch[]>([])

  useEffect(() => {
    getBranches().then((res) => {
      if (res.success && res.data) setBranches(res.data)
    })
  }, [])

  if (branches.length === 0) return null

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {branches.map((b) => (
          <SelectItem key={b.id} value={b.id}>
            {b.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
