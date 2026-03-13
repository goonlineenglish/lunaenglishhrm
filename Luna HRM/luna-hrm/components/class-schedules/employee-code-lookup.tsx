'use client'

/**
 * Employee code auto-complete input.
 * Type employee code (E01) → debounce → query → show name + position.
 */

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { lookupEmployeeByCode, type EmployeeLookup } from '@/lib/actions/class-schedule-actions'
import type { EmployeePosition } from '@/lib/types/database'
import { POSITION_LABELS } from '@/lib/types/user'

interface Props {
  value: string
  onSelect: (employee: EmployeeLookup) => void
  position?: EmployeePosition
  placeholder?: string
  disabled?: boolean
}

export function EmployeeCodeLookup({ value, onSelect, position, placeholder, disabled }: Props) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<EmployeeLookup[]>([])
  const [open, setOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Sync external value
  useEffect(() => { setQuery(value) }, [value])

  // Click outside to close
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleChange(val: string) {
    setQuery(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (val.length < 1) { setResults([]); setOpen(false); return }

    timerRef.current = setTimeout(async () => {
      const res = await lookupEmployeeByCode(val, position)
      if (res.success && res.data) {
        setResults(res.data)
        setOpen(res.data.length > 0)
      }
    }, 300)
  }

  function handleSelect(emp: EmployeeLookup) {
    setQuery(emp.employee_code)
    setOpen(false)
    onSelect(emp)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder ?? 'Nhập mã NV (VD: E01)'}
        disabled={disabled}
      />
      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-auto">
          {results.map((emp) => (
            <li
              key={emp.id}
              className="px-3 py-2 text-sm hover:bg-accent cursor-pointer flex justify-between"
              onClick={() => handleSelect(emp)}
            >
              <span className="font-medium">{emp.employee_code}</span>
              <span className="text-muted-foreground">
                {emp.full_name} — {POSITION_LABELS[emp.position as EmployeePosition] ?? emp.position}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
