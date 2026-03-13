'use client'

/**
 * Evaluation templates page — admin only. List templates, create new.
 * /evaluation-templates
 */

import { useState, useEffect, useCallback } from 'react'
import { ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { EvaluationTemplateTable } from '@/components/evaluations/evaluation-template-table'
import { EvaluationTemplateForm } from '@/components/evaluations/evaluation-template-form'
import { getEvaluationTemplates, deactivateTemplate } from '@/lib/actions/evaluation-template-actions'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import type { EvaluationTemplateWithCount } from '@/lib/types/evaluation'

export default function EvaluationTemplatesPage() {
  const [templates, setTemplates] = useState<EvaluationTemplateWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (u?.role === 'admin') setIsAdmin(true)
    })
  }, [])

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await getEvaluationTemplates()
    if (result.success && result.data) setTemplates(result.data)
    else setError(result.error ?? 'Lỗi tải danh sách mẫu đánh giá.')
    setLoading(false)
  }, [])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  async function handleDeactivate(id: string) {
    const result = await deactivateTemplate(id)
    if (!result.success) setError(result.error ?? 'Lỗi vô hiệu hóa mẫu.')
    else fetchTemplates()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          <h1 className="text-xl font-bold">Mẫu đánh giá</h1>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setFormOpen(true)}>
            + Tạo mẫu
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive"><p className="text-sm">{error}</p></Alert>
      )}

      <EvaluationTemplateTable
        templates={templates}
        onDeactivate={isAdmin ? handleDeactivate : undefined}
        loading={loading}
      />

      <EvaluationTemplateForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={fetchTemplates}
      />
    </div>
  )
}
