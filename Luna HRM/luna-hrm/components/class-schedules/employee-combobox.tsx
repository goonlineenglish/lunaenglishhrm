'use client'

/**
 * Employee combobox — prefetch list once, client-side fuzzy filter.
 * Replaces EmployeeCodeLookup (per-keystroke server call).
 */

import { useState } from 'react'
import { ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'
import type { EmployeeLookup } from '@/lib/actions/class-schedule-actions'

interface Props {
  employees: EmployeeLookup[]
  value: string                         // employee_id (controlled)
  onSelect: (emp: EmployeeLookup) => void
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  /** Fallback label for inactive/missing employees (e.g. from edit data) */
  fallbackLabel?: string
}

export function EmployeeCombobox({
  employees, value, onSelect, placeholder = 'Chọn nhân viên', disabled, loading, fallbackLabel,
}: Props) {
  const [open, setOpen] = useState(false)

  const selected = employees.find((e) => e.id === value)

  const displayLabel = loading
    ? 'Đang tải...'
    : selected
      ? `${selected.full_name} (${selected.employee_code})`
      : value
        ? (fallbackLabel ? `⚠ ${fallbackLabel} (ngừng HĐ)` : 'Không tìm thấy NV')
        : placeholder

  const isInactiveFallback = !loading && !selected && value
  const labelClass = isInactiveFallback
    ? 'text-destructive'
    : !selected
      ? 'text-muted-foreground'
      : ''

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className={cn('w-full justify-between font-normal', labelClass)}
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Tìm tên hoặc mã NV..." />
          <CommandList>
            <CommandEmpty>Không tìm thấy nhân viên.</CommandEmpty>
            <CommandGroup>
              {employees.map((emp) => (
                <CommandItem
                  key={emp.id}
                  // ISSUE-1 fix: include both name AND code so cmdk fuzzy-matches either
                  value={`${emp.full_name} ${emp.employee_code}`}
                  onSelect={() => {
                    onSelect(emp)
                    setOpen(false)
                  }}
                >
                  <span className="font-medium">{emp.full_name}</span>
                  <span className="text-muted-foreground text-xs ml-1">
                    {emp.employee_code}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
