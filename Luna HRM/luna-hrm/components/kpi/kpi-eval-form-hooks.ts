'use client'

/**
 * useKpiEvalForm — data-fetching and save logic for KPI evaluation form.
 * Returns all state and handlers needed by the page component.
 */

import { useState, useEffect, useCallback } from 'react'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import {
  getKpiEvaluation, getPreviousKpi, saveKpiEvaluation, getKpiHistory,
} from '@/lib/actions/kpi-actions'
import { calculateTotalScore } from '@/lib/services/kpi-calculation-service'
import { MANDATORY_CRITERIA, type KpiFormData } from '@/lib/types/kpi'
import type { KpiEvaluation, KpiEvaluationInsert } from '@/lib/types/database'
import type { PartBKey } from '@/components/kpi/kpi-part-b-scores'

const DEFAULT_FORM: KpiFormData = {
  base_pass: true,
  mandatory_checks: MANDATORY_CRITERIA.map(() => true),
  tsi_score: 0, tsi_comment: '',
  funtime_score: 0, funtime_comment: '',
  parent_score: 0, parent_comment: '',
  student_score: 0, student_comment: '',
  demeanor_score: 0, demeanor_comment: '',
}

function evalToForm(ev: KpiEvaluation): KpiFormData {
  return {
    base_pass: ev.base_pass,
    mandatory_checks: MANDATORY_CRITERIA.map(() => ev.base_pass),
    tsi_score: ev.tsi_score, tsi_comment: ev.tsi_comment ?? '',
    funtime_score: ev.funtime_score, funtime_comment: ev.funtime_comment ?? '',
    parent_score: ev.parent_score, parent_comment: ev.parent_comment ?? '',
    student_score: ev.student_score, student_comment: ev.student_comment ?? '',
    demeanor_score: ev.demeanor_score, demeanor_comment: ev.demeanor_comment ?? '',
  }
}

export function useKpiEvalForm(employeeId: string, month: number, year: number) {
  const [form, setForm] = useState<KpiFormData>(DEFAULT_FORM)
  const [branchId, setBranchId] = useState('')
  const [history, setHistory] = useState<KpiEvaluation[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [prefilled, setPrefilled] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [userResult, evalResult, prevResult, histResult] = await Promise.all([
      getCurrentUser(),
      getKpiEvaluation(employeeId, month, year),
      getPreviousKpi(employeeId, month, year),
      getKpiHistory(employeeId),
    ])

    if (userResult) setBranchId(userResult.branch_id ?? '')

    if (!evalResult.success) {
      setError(evalResult.error ?? 'Lỗi tải đánh giá.')
      setLoading(false)
      return
    }

    if (evalResult.data) {
      setForm(evalToForm(evalResult.data))
      setBranchId(evalResult.data.branch_id)
    } else if (prevResult.data) {
      const prev = prevResult.data
      setForm({
        base_pass: prev.base_pass,
        mandatory_checks: MANDATORY_CRITERIA.map(() => prev.base_pass),
        tsi_score: prev.tsi_score, tsi_comment: '',
        funtime_score: prev.funtime_score, funtime_comment: '',
        parent_score: prev.parent_score, parent_comment: '',
        student_score: prev.student_score, student_comment: '',
        demeanor_score: prev.demeanor_score, demeanor_comment: '',
      })
      setBranchId(prev.branch_id)
      setPrefilled(true)
    }

    if (histResult.success && histResult.data) setHistory(histResult.data)
    setLoading(false)
  }, [employeeId, month, year])

  useEffect(() => { fetchData() }, [fetchData])

  function handleFormField(field: PartBKey, value: number | string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSaveSuccess(false)
  }

  function handleChecks(checks: boolean[]) {
    setForm((prev) => ({ ...prev, mandatory_checks: checks }))
    setSaveSuccess(false)
  }

  async function handleSave() {
    if (!branchId) { setError('Không xác định được chi nhánh.'); return }
    setSaving(true)
    setError(null)
    const basePassed = form.mandatory_checks.every(Boolean)
    const payload: KpiEvaluationInsert = {
      employee_id: employeeId, branch_id: branchId, month, year,
      base_pass: basePassed,
      tsi_score: form.tsi_score, tsi_comment: form.tsi_comment || null,
      funtime_score: form.funtime_score, funtime_comment: form.funtime_comment || null,
      parent_score: form.parent_score, parent_comment: form.parent_comment || null,
      student_score: form.student_score, student_comment: form.student_comment || null,
      demeanor_score: form.demeanor_score, demeanor_comment: form.demeanor_comment || null,
      total_score: calculateTotalScore({
        tsi: form.tsi_score, funtime: form.funtime_score,
        parent: form.parent_score, student: form.student_score,
        demeanor: form.demeanor_score,
      }),
      bonus_amount: 0, evaluated_by: '',
    }
    const result = await saveKpiEvaluation(payload)
    if (result.success) {
      setSaveSuccess(true)
      setPrefilled(false)
      if (result.data) setBranchId(result.data.branch_id)
    } else {
      setError(result.error ?? 'Lỗi lưu KPI.')
    }
    setSaving(false)
  }

  const totalScore = calculateTotalScore({
    tsi: form.tsi_score, funtime: form.funtime_score,
    parent: form.parent_score, student: form.student_score,
    demeanor: form.demeanor_score,
  })
  const basePassed = form.mandatory_checks.every(Boolean)

  return {
    form, history, loading, saving, error,
    prefilled, saveSuccess, totalScore, basePassed,
    handleFormField, handleChecks, handleSave,
  }
}
