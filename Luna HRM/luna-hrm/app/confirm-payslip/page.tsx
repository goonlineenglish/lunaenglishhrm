/**
 * Token-based payslip confirmation page — accessed via email link.
 * No auth session required: validates via confirmation_token.
 * GET params: ?token=xxx&action=confirm|dispute
 */

import { Suspense } from 'react'
import { ConfirmPayslipForm } from './confirm-payslip-form'

interface PageProps {
  searchParams: Promise<{ token?: string; action?: string }>
}

export default async function ConfirmPayslipPage({ searchParams }: PageProps) {
  const { token, action } = await searchParams
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-muted-foreground text-sm">Đang tải...</div>}>
        <ConfirmPayslipForm token={token ?? ''} action={action === 'dispute' ? 'dispute' : 'confirm'} />
      </Suspense>
    </div>
  )
}
