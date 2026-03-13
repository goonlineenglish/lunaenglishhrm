'use client'

/**
 * Simple month/year navigation selector.
 * Uses URL search params (month, year) — no state, SSR-compatible.
 */

import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MonthYearPickerProps {
  month: number      // 1–12
  year: number
  basePath: string   // e.g. "/my-attendance"
}

const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
]

export function MonthYearPicker({ month, year, basePath }: MonthYearPickerProps) {
  const router = useRouter()

  function navigate(m: number, y: number) {
    router.push(`${basePath}?month=${m}&year=${y}`)
  }

  function goPrev() {
    if (month === 1) navigate(12, year - 1)
    else navigate(month - 1, year)
  }

  function goNext() {
    if (month === 12) navigate(1, year + 1)
    else navigate(month + 1, year)
  }

  return (
    <div className="flex items-center justify-between border rounded-lg px-3 py-2 bg-muted/30">
      <Button variant="ghost" size="icon" onClick={goPrev} className="h-8 w-8">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium">
        {MONTH_NAMES[month - 1]} {year}
      </span>
      <Button variant="ghost" size="icon" onClick={goNext} className="h-8 w-8">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
