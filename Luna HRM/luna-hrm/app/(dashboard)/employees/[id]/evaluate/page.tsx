'use client'

/**
 * Evaluate employee page — /employees/[id]/evaluate
 * BM/admin: fill out evaluation form for an employee.
 */

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EvaluationForm } from '@/components/evaluations/evaluation-form'

export default function EvaluateEmployeePage() {
  const params = useParams()
  const router = useRouter()
  const employeeId = params?.id as string

  function handleSuccess() {
    router.push(`/employees/${employeeId}`)
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Quay lại
        </Button>
        <h1 className="text-lg font-semibold">Tạo đánh giá nhân viên</h1>
      </div>

      <EvaluationForm
        employeeId={employeeId}
        onSuccess={handleSuccess}
        onCancel={() => router.back()}
      />
    </div>
  )
}
