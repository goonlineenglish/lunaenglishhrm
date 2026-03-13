/**
 * Employee self-service: payslip list (mobile-optimized cards).
 * Shows only confirmed/sent payslips. Most recent first.
 * Employee role only.
 */

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { getMyPayslips } from '@/lib/actions/employee-portal-actions'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatVNDFull } from '@/lib/utils/number-format'
import { ChevronRight, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Đã xác nhận',
  sent: 'Đã gửi',
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  confirmed: 'secondary',
  sent: 'default',
}

export default async function MyPayslipsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'employee') redirect('/dashboard')

  const result = await getMyPayslips()
  const payslips = result.data ?? []

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div>
        <h1 className="text-xl font-bold">Phiếu lương của tôi</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {payslips.length > 0 ? `${payslips.length} phiếu` : 'Chưa có phiếu lương'}
        </p>
      </div>

      {result.error && (
        <p className="text-sm text-destructive">{result.error}</p>
      )}

      {payslips.length === 0 && !result.error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
            <Wallet className="h-8 w-8 opacity-40" />
            <p className="text-sm">Chưa có phiếu lương nào.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {payslips.map((p) => (
          <Link key={p.id} href={`/my-payslips/${p.id}`}>
            <Card className="hover:bg-muted/40 transition-colors cursor-pointer">
              <CardContent className="flex items-center justify-between py-4">
                <div className="space-y-0.5">
                  <p className="font-semibold text-sm">
                    T{p.month}/{p.year}
                  </p>
                  <p className="text-lg font-bold text-foreground">
                    {formatVNDFull(p.net_pay)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={STATUS_VARIANTS[p.status] ?? 'outline'}
                    className={cn('text-xs', p.status === 'sent' && 'bg-green-100 text-green-700 border-green-200')}
                  >
                    {STATUS_LABELS[p.status] ?? p.status}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
