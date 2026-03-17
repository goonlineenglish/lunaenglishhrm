import { describe, it, expect } from 'vitest'
import { fetchPrefillData } from '@/lib/services/payroll-prefill-service'
import type { SupabaseClient } from '@supabase/supabase-js'

// ─── Supabase mock builder ────────────────────────────────────────────────────

/**
 * Build a minimal Supabase client mock.
 * queryResults: map of table name → the data array to return.
 */
function buildMockClient(
  queryResults: Record<string, { data: unknown[] | null; single?: unknown }>
): SupabaseClient {
  const from = (table: string) => {
    const result = queryResults[table] ?? { data: [] }
    const chain = {
      select: () => chain,
      eq: () => chain,
      in: () => chain,
      not: () => chain,
      gte: () => chain,
      lte: () => chain,
      maybeSingle: () => Promise.resolve({ data: result.single ?? null, error: null }),
      then: undefined as unknown,
    }
    // Make chain itself thenable for direct .from().select()... resolves
    Object.defineProperty(chain, 'then', {
      get: () => (res: (v: { data: unknown[]; error: null }) => void) =>
        res({ data: result.data ?? [], error: null }),
    })
    return chain
  }
  return { from } as unknown as SupabaseClient
}

// ─── Tests ────────────────────────────────────────────────────────────────────

const EMP_ID = 'emp-001'
const PERIOD_START = '2026-03-01'
const PERIOD_END = '2026-03-31'

describe('fetchPrefillData — return shape', () => {
  it('returns PrefillData with all required fields', async () => {
    const sb = buildMockClient({
      kpi_evaluations: { data: [], single: null },
      salary_components: { data: [] },
      employee_weekly_notes: { data: [] },
    })

    const result = await fetchPrefillData(sb, EMP_ID, PERIOD_START, PERIOD_END)

    expect(result).toHaveProperty('kpi_bonus')
    expect(result).toHaveProperty('allowances')
    expect(result).toHaveProperty('deductions')
    expect(result).toHaveProperty('penalties')
    expect(result).toHaveProperty('other_pay')
  })

  it('all zeros when no data in any table', async () => {
    const sb = buildMockClient({
      kpi_evaluations: { data: [], single: null },
      salary_components: { data: [] },
      employee_weekly_notes: { data: [] },
    })

    const result = await fetchPrefillData(sb, EMP_ID, PERIOD_START, PERIOD_END)
    expect(result.kpi_bonus).toBe(0)
    expect(result.allowances).toBe(0)
    expect(result.deductions).toBe(0)
    expect(result.penalties).toBe(0)
    expect(result.other_pay).toBe(0)
  })
})

describe('fetchPrefillData — KPI bonus', () => {
  it('kpi_bonus from kpi_evaluations.bonus_amount', async () => {
    const sb = buildMockClient({
      kpi_evaluations: { data: [], single: { bonus_amount: 300_000 } },
      salary_components: { data: [] },
      employee_weekly_notes: { data: [] },
    })

    const result = await fetchPrefillData(sb, EMP_ID, PERIOD_START, PERIOD_END)
    expect(result.kpi_bonus).toBe(300_000)
  })

  it('kpi_bonus = 0 when no KPI evaluation exists', async () => {
    const sb = buildMockClient({
      kpi_evaluations: { data: [], single: null },
      salary_components: { data: [] },
      employee_weekly_notes: { data: [] },
    })

    const result = await fetchPrefillData(sb, EMP_ID, PERIOD_START, PERIOD_END)
    expect(result.kpi_bonus).toBe(0)
  })
})

describe('fetchPrefillData — salary_components aggregation', () => {
  it('multiple allowances summed correctly', async () => {
    // salary_components is queried twice (allowances + deductions) — return different data
    const from = (table: string) => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        },
        in: () => chain,
        not: () => chain,
        gte: () => chain,
        lte: () => chain,
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        then: undefined as unknown,
      }
      const allowanceData = [{ amount: 200_000 }, { amount: 300_000 }]
      Object.defineProperty(chain, 'then', {
        get: () => (res: (v: { data: unknown[]; error: null }) => void) =>
          res({ data: table === 'salary_components' ? allowanceData : [], error: null }),
      })
      return chain
    }

    const result = await fetchPrefillData({ from } as unknown as SupabaseClient, EMP_ID, PERIOD_START, PERIOD_END)
    // allowances from 2 components: 200k + 300k = 500k
    expect(result.allowances).toBe(500_000)
  })

  it('deductions summed from multiple components', async () => {
    // Build a client that returns deduction data for salary_components
    const deductionData = [{ amount: 100_000 }, { amount: 50_000 }]
    const from = (table: string) => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        not: () => chain,
        gte: () => chain,
        lte: () => chain,
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        then: undefined as unknown,
      }
      Object.defineProperty(chain, 'then', {
        get: () => (res: (v: { data: unknown[]; error: null }) => void) =>
          res({ data: table === 'salary_components' ? deductionData : [], error: null }),
      })
      return chain
    }

    const result = await fetchPrefillData({ from } as unknown as SupabaseClient, EMP_ID, PERIOD_START, PERIOD_END)
    // 150k from each query (allowance + deduction both return same mock data)
    expect(result.deductions).toBe(150_000)
    expect(result.allowances).toBe(150_000)
  })
})

describe('fetchPrefillData — weekly_notes aggregation', () => {
  it('penalties summed from employee_weekly_notes type=penalty', async () => {
    const penaltyData = [{ amount: 200_000 }, { amount: 300_000 }]
    const from = (table: string) => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        not: () => chain,
        gte: () => chain,
        lte: () => chain,
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        then: undefined as unknown,
      }
      Object.defineProperty(chain, 'then', {
        get: () => (res: (v: { data: unknown[]; error: null }) => void) =>
          res({ data: table === 'employee_weekly_notes' ? penaltyData : [], error: null }),
      })
      return chain
    }

    const result = await fetchPrefillData({ from } as unknown as SupabaseClient, EMP_ID, PERIOD_START, PERIOD_END)
    expect(result.penalties).toBe(500_000)
    expect(result.other_pay).toBe(500_000) // both weekly note queries return same mock data
  })

  it('other_pay = 0 when no bonus/extra_job notes', async () => {
    const sb = buildMockClient({
      kpi_evaluations: { data: [], single: null },
      salary_components: { data: [] },
      employee_weekly_notes: { data: [] },
    })

    const result = await fetchPrefillData(sb, EMP_ID, PERIOD_START, PERIOD_END)
    expect(result.other_pay).toBe(0)
  })
})
