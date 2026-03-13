'use client'

/**
 * Attendance status color legend strip.
 */

export function AttendanceLegend() {
  const items = [
    { label: '1 — Có mặt', className: 'bg-green-100 border-green-300 text-green-800' },
    { label: '0 — Vắng có phép', className: 'bg-blue-100 border-blue-300 text-blue-800' },
    { label: 'KP — Vắng không phép', className: 'bg-red-100 border-red-300 text-red-800' },
    { label: '0.5 — Nửa buổi', className: 'bg-yellow-100 border-yellow-300 text-yellow-800' },
    { label: '— Không có lịch', className: 'bg-muted/50 border-input text-muted-foreground' },
  ]

  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {items.map((item) => (
        <span key={item.label} className={`px-2 py-0.5 rounded border ${item.className}`}>
          {item.label}
        </span>
      ))}
    </div>
  )
}
