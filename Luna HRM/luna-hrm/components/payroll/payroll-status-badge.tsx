'use client'

/**
 * Payroll status badge — draft/confirmed/sent with Vietnamese labels.
 */

import { Badge } from '@/components/ui/badge'
import type { PayrollStatus } from '@/lib/types/database'

interface Props {
  status: PayrollStatus
}

const STATUS_CONFIG: Record<PayrollStatus, { label: string; variant: 'secondary' | 'default' | 'outline' }> = {
  draft: { label: 'Nháp', variant: 'secondary' },
  confirmed: { label: 'Đã duyệt', variant: 'default' },
  sent: { label: 'Đã gửi', variant: 'outline' },
  finalized: { label: 'Đã chốt', variant: 'outline' },
}

export function PayrollStatusBadge({ status }: Props) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft
  return (
    <Badge variant={config.variant} className={
      status === 'confirmed' ? 'bg-green-100 text-green-800 border-green-200' :
      status === 'sent' ? 'bg-blue-100 text-blue-800 border-blue-200' :
      status === 'finalized' ? 'bg-purple-100 text-purple-800 border-purple-200' :
      ''
    }>
      {config.label}
    </Badge>
  )
}
