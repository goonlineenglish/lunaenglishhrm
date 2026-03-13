'use client'

/**
 * Attendance cell — click to cycle status: 1 → 0 → KP → 0.5 → 1
 * Keyboard: type '1', '0', 'k' (KP), 'h' (0.5)
 * Color-coded: green(1), blue(0), red(KP), yellow(0.5), gray(disabled)
 */

import type { AttendanceStatus } from '@/lib/types/database'

const STATUS_CYCLE: (AttendanceStatus)[] = ['1', '0', 'KP', '0.5']

const STATUS_STYLES: Record<AttendanceStatus, string> = {
  '1': 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400',
  '0': 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400',
  'KP': 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400',
  '0.5': 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400',
}

interface Props {
  status: AttendanceStatus | null
  isScheduled: boolean
  disabled?: boolean
  onChange: (status: AttendanceStatus) => void
}

export function AttendanceCell({ status, isScheduled, disabled, onChange }: Props) {
  if (!isScheduled) {
    return (
      <td className="w-10 h-10 text-center border bg-muted/50">
        <span className="text-xs text-muted-foreground">—</span>
      </td>
    )
  }

  const isDisabled = disabled || false

  function handleClick() {
    if (isDisabled) return
    const currentIdx = status ? STATUS_CYCLE.indexOf(status) : -1
    const nextIdx = (currentIdx + 1) % STATUS_CYCLE.length
    onChange(STATUS_CYCLE[nextIdx])
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (isDisabled) return
    switch (e.key) {
      case '1': onChange('1'); break
      case '0': onChange('0'); break
      case 'k': case 'K': onChange('KP'); break
      case 'h': case 'H': onChange('0.5'); break
    }
  }

  const style = status ? STATUS_STYLES[status] : 'bg-background border-input'

  return (
    <td
      className={`w-10 h-10 text-center border text-sm font-medium cursor-pointer select-none transition-colors ${style} ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={isDisabled ? -1 : 0}
      role="button"
      aria-label={`Trạng thái: ${status ?? 'chưa chấm'}`}
    >
      {status ?? ''}
    </td>
  )
}
