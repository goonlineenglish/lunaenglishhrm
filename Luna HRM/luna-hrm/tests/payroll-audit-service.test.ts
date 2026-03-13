import { describe, it, expect } from 'vitest'
import { buildAuditLogEntries } from '@/lib/services/payroll-audit-service'
import type { EditablePayslipFields } from '@/lib/types/database-payroll-types'

const PAYSLIP_ID = 'test-payslip-001'
const CHANGED_BY = 'test-user-001'

describe('buildAuditLogEntries', () => {
  describe('No changes', () => {
    it('same values → empty array', () => {
      const old: Partial<EditablePayslipFields> = { kpi_bonus: 300_000, net_pay: 5_000_000 }
      const result = buildAuditLogEntries(PAYSLIP_ID, old, old, CHANGED_BY)
      expect(result).toHaveLength(0)
    })

    it('empty old and new → empty array', () => {
      const result = buildAuditLogEntries(PAYSLIP_ID, {}, {}, CHANGED_BY)
      expect(result).toHaveLength(0)
    })

    it('fields absent from newVals (undefined) are skipped', () => {
      const old: Partial<EditablePayslipFields> = { kpi_bonus: 100_000, net_pay: 3_000_000 }
      const newVals: Partial<EditablePayslipFields> = {} // no fields being updated
      const result = buildAuditLogEntries(PAYSLIP_ID, old, newVals, CHANGED_BY)
      expect(result).toHaveLength(0)
    })
  })

  describe('Single field changed', () => {
    it('net_pay 5M → 4.5M → 1 entry with correct old/new', () => {
      const old: Partial<EditablePayslipFields> = { net_pay: 5_000_000 }
      const newVals: Partial<EditablePayslipFields> = { net_pay: 4_500_000 }
      const result = buildAuditLogEntries(PAYSLIP_ID, old, newVals, CHANGED_BY)
      expect(result).toHaveLength(1)
      expect(result[0].field_name).toBe('net_pay')
      expect(result[0].old_value).toBe('5000000')
      expect(result[0].new_value).toBe('4500000')
    })

    it('kpi_bonus 0 → 300000 → 1 entry', () => {
      const old: Partial<EditablePayslipFields> = { kpi_bonus: 0 }
      const newVals: Partial<EditablePayslipFields> = { kpi_bonus: 300_000 }
      const result = buildAuditLogEntries(PAYSLIP_ID, old, newVals, CHANGED_BY)
      expect(result).toHaveLength(1)
      expect(result[0].field_name).toBe('kpi_bonus')
    })

    it('extra_notes null → "note text" → 1 entry', () => {
      const old: Partial<EditablePayslipFields> = { extra_notes: null }
      const newVals: Partial<EditablePayslipFields> = { extra_notes: 'dạy thêm buổi 5' }
      const result = buildAuditLogEntries(PAYSLIP_ID, old, newVals, CHANGED_BY)
      expect(result).toHaveLength(1)
      expect(result[0].old_value).toBeNull()
      expect(result[0].new_value).toBe('dạy thêm buổi 5')
    })
  })

  describe('Multiple fields changed', () => {
    it('3 fields changed → 3 entries', () => {
      const old: Partial<EditablePayslipFields> = {
        bhxh: 800_000, bhyt: 150_000, gross_pay: 10_000_000,
      }
      const newVals: Partial<EditablePayslipFields> = {
        bhxh: 900_000, bhyt: 160_000, gross_pay: 11_000_000,
      }
      const result = buildAuditLogEntries(PAYSLIP_ID, old, newVals, CHANGED_BY)
      expect(result).toHaveLength(3)
      const fields = result.map((r) => r.field_name)
      expect(fields).toContain('bhxh')
      expect(fields).toContain('bhyt')
      expect(fields).toContain('gross_pay')
    })

    it('mixed: 2 changed, 1 unchanged → 2 entries', () => {
      const old: Partial<EditablePayslipFields> = {
        net_pay: 5_000_000, bhxh: 800_000, tncn: 0,
      }
      const newVals: Partial<EditablePayslipFields> = {
        net_pay: 4_500_000, bhxh: 800_000, tncn: 200_000,
      }
      const result = buildAuditLogEntries(PAYSLIP_ID, old, newVals, CHANGED_BY)
      expect(result).toHaveLength(2)
      expect(result.map((r) => r.field_name)).not.toContain('bhxh')
    })
  })

  describe('Correct metadata', () => {
    it('payslip_id and changed_by are set on every entry', () => {
      const old: Partial<EditablePayslipFields> = { net_pay: 5_000_000 }
      const newVals: Partial<EditablePayslipFields> = { net_pay: 6_000_000 }
      const result = buildAuditLogEntries(PAYSLIP_ID, old, newVals, CHANGED_BY)
      expect(result[0].payslip_id).toBe(PAYSLIP_ID)
      expect(result[0].changed_by).toBe(CHANGED_BY)
    })

    it('null old value is stored as null (not "null" string)', () => {
      const old: Partial<EditablePayslipFields> = { extra_notes: null }
      const newVals: Partial<EditablePayslipFields> = { extra_notes: 'note' }
      const result = buildAuditLogEntries(PAYSLIP_ID, old, newVals, CHANGED_BY)
      expect(result[0].old_value).toBeNull()
    })

    it('null new value is stored as null', () => {
      const old: Partial<EditablePayslipFields> = { extra_notes: 'old note' }
      const newVals: Partial<EditablePayslipFields> = { extra_notes: null }
      const result = buildAuditLogEntries(PAYSLIP_ID, old, newVals, CHANGED_BY)
      expect(result[0].new_value).toBeNull()
    })
  })

  describe('Edge cases', () => {
    it('undefined oldVal with defined newVal → creates entry (first time set)', () => {
      const old: Partial<EditablePayslipFields> = {}
      const newVals: Partial<EditablePayslipFields> = { net_pay: 5_000_000 }
      const result = buildAuditLogEntries(PAYSLIP_ID, old, newVals, CHANGED_BY)
      expect(result).toHaveLength(1)
      expect(result[0].old_value).toBeNull()
      expect(result[0].new_value).toBe('5000000')
    })

    it('numeric 0 vs 0 — no change', () => {
      const old: Partial<EditablePayslipFields> = { tncn: 0 }
      const newVals: Partial<EditablePayslipFields> = { tncn: 0 }
      const result = buildAuditLogEntries(PAYSLIP_ID, old, newVals, CHANGED_BY)
      expect(result).toHaveLength(0)
    })

    it('all audited fields can be tracked', () => {
      const old: Partial<EditablePayslipFields> = {
        kpi_bonus: 0, allowances: 0, deductions: 0, penalties: 0, other_pay: 0,
        bhxh: 0, bhyt: 0, bhtn: 0, tncn: 0, gross_pay: 0, net_pay: 0, extra_notes: null,
      }
      const newVals: Partial<EditablePayslipFields> = {
        kpi_bonus: 100, allowances: 200, deductions: 300, penalties: 400, other_pay: 500,
        bhxh: 600, bhyt: 700, bhtn: 800, tncn: 900, gross_pay: 10_000, net_pay: 8_000, extra_notes: 'note',
      }
      const result = buildAuditLogEntries(PAYSLIP_ID, old, newVals, CHANGED_BY)
      expect(result).toHaveLength(12)
    })
  })
})
