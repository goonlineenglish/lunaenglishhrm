'use client'

/**
 * Confirm-payslip form — client component.
 * Handles confirm (immediate) and dispute (requires feedback text).
 */

import { useState } from 'react'
import { confirmMyPayslip } from '@/lib/actions/employee-confirmation-actions'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react'

interface Props {
  token: string
  action: 'confirm' | 'dispute'
}

type State = 'idle' | 'loading' | 'success' | 'error'

export function ConfirmPayslipForm({ token, action: initialAction }: Props) {
  const [currentAction, setCurrentAction] = useState<'confirm' | 'dispute'>(initialAction)
  const [feedback, setFeedback] = useState('')
  const [state, setState] = useState<State>('idle')
  const [message, setMessage] = useState('')
  const [employeeInfo, setEmployeeInfo] = useState<{ name: string; month: number; year: number } | null>(null)

  if (!token) {
    return (
      <Card>
        <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-center mb-1">Liên kết không hợp lệ</h2>
        <p className="text-sm text-muted-foreground text-center">Vui lòng dùng liên kết trong email được gửi đến bạn.</p>
      </Card>
    )
  }

  async function handleSubmit() {
    if (currentAction === 'dispute' && !feedback.trim()) {
      setMessage('Vui lòng ghi rõ lý do khiếu nại.')
      return
    }
    setState('loading')
    setMessage('')
    const result = await confirmMyPayslip({ token, action: currentAction, feedback: feedback.trim() || undefined })
    if (result.success && result.data) {
      setState('success')
      setEmployeeInfo({ name: result.data.employeeName, month: result.data.month, year: result.data.year })
    } else {
      setState('error')
      setMessage(result.error ?? 'Đã xảy ra lỗi.')
    }
  }

  if (state === 'success') {
    return (
      <Card>
        <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-center mb-1">
          {currentAction === 'confirm' ? 'Đã xác nhận!' : 'Đã gửi khiếu nại!'}
        </h2>
        <p className="text-sm text-muted-foreground text-center">
          {employeeInfo
            ? `Phiếu lương tháng ${employeeInfo.month}/${employeeInfo.year} của ${employeeInfo.name}.`
            : 'Cảm ơn bạn đã phản hồi.'}
        </p>
        {currentAction === 'dispute' && (
          <p className="text-xs text-muted-foreground text-center mt-2">Kế toán sẽ xem xét và liên hệ với bạn sớm.</p>
        )}
      </Card>
    )
  }

  return (
    <Card>
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-purple-100 mb-3">
          <span className="text-2xl">💼</span>
        </div>
        <h1 className="text-xl font-bold">Xác nhận phiếu lương</h1>
        <p className="text-sm text-muted-foreground mt-1">Luna HRM · Buttercup English Center</p>
      </div>

      {/* Action toggle */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => { setCurrentAction('confirm'); setMessage('') }}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
            currentAction === 'confirm'
              ? 'bg-green-600 text-white border-green-600'
              : 'bg-white text-muted-foreground border-border hover:border-green-400'
          }`}
        >
          ✓ Xác nhận
        </button>
        <button
          onClick={() => { setCurrentAction('dispute'); setMessage('') }}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
            currentAction === 'dispute'
              ? 'bg-red-600 text-white border-red-600'
              : 'bg-white text-muted-foreground border-border hover:border-red-400'
          }`}
        >
          ✗ Khiếu nại
        </button>
      </div>

      {/* Dispute feedback */}
      {currentAction === 'dispute' && (
        <div className="mb-4">
          <label className="text-sm font-medium mb-1 block">Lý do khiếu nại <span className="text-destructive">*</span></label>
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Ví dụ: Số buổi dạy sai, thiếu phụ cấp..."
            rows={3}
            className="text-sm"
          />
        </div>
      )}

      {/* Error message */}
      {state === 'error' && message && (
        <div className="flex items-center gap-2 text-destructive text-sm mb-4 bg-red-50 p-3 rounded-lg">
          <XCircle className="h-4 w-4 flex-shrink-0" />
          {message}
        </div>
      )}
      {state === 'idle' && message && (
        <p className="text-destructive text-sm mb-3">{message}</p>
      )}

      <Button
        className={`w-full ${currentAction === 'dispute' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
        onClick={handleSubmit}
        disabled={state === 'loading'}
      >
        {state === 'loading' ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Đang xử lý...</>
        ) : currentAction === 'confirm' ? (
          '✓ Xác nhận phiếu lương'
        ) : (
          '✗ Gửi khiếu nại'
        )}
      </Button>
    </Card>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-border/50 p-6 w-full max-w-sm">
      {children}
    </div>
  )
}
