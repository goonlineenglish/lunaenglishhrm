# Codex Plan Review — Email Notification + Employee Confirmation

**Date:** 2026-03-16
**Plan:** Email Notification + Employee Confirmation Workflow
**Effort:** HIGH
**Rounds:** 5

---

## Review Summary

| Metric | Value |
|--------|-------|
| Rounds | 5 |
| Verdict | **APPROVE** |
| Issues Found | 13 total (R1: 8, R2: 3, R3: 3 regressions, R4: 2) |
| Issues Fixed | 12 |
| Issues Disputed | 1 (ISSUE-5: token lifecycle — accepted as valid rebuttal) |

---

## Round 1 (8 issues)

| # | Severity | Title | Status |
|---|----------|-------|--------|
| 1 | HIGH | Payroll status backward-incompatible (drops 'sent') | ✅ Fixed: kept 'sent' in constraint |
| 2 | HIGH | RLS overly permissive (salary-tampering risk) | ✅ Fixed: removed direct RLS UPDATE, use admin client |
| 3 | HIGH | Auth model conflicts (BM vs admin/accountant) | ✅ Fixed: sender = admin/accountant only |
| 4 | HIGH | Partial-send deadlock (failed emails block finalize) | ✅ Fixed: 3-way advancement logic |
| 5 | MEDIUM | Token lifecycle claims unbackable | ❌ Disputed: static UUID verification, not session token |
| 6 | MEDIUM | Reminder cron not idempotent | ✅ Fixed: added reminder_sent_at column |
| 7 | MEDIUM | Action return type inconsistency | ✅ Fixed: all use ActionResult<T> |
| 8 | MEDIUM | Dispute cap only app-level | ✅ Fixed: DB CHECK constraint added |

## Round 2 (3 issues)

| # | Severity | Title | Status |
|---|----------|-------|--------|
| 1 | HIGH | AUTO_CONFIRM audit action invalid | ✅ Fixed: use action='UPDATE' with source in newData |
| 2 | MEDIUM | Skip-email path blocks finalize | ✅ Fixed: auto-confirm no-email payslips |
| 3 | LOW | Missing reminder idempotency test | ✅ Fixed: added test case |

## Round 3 (3 regression issues — plan text not updated)

All 3 were regressions because fixes were verbal but not applied to plan file. Fixed by editing plan file directly.

## Round 4 (2 issues)

| # | Severity | Title | Status |
|---|----------|-------|--------|
| 1 | MEDIUM | All-auto-confirmed edge case (sent=0, failed=0) | ✅ Fixed: 3-way logic covers this case |
| 2 | LOW | File summary still lists weekly/kpi-reminder | ✅ Fixed: removed from summary |

## Round 5

**VERDICT: APPROVE** — No further issues.

---

## Key Plan Changes from Review

1. **PayrollStatus keeps 'sent'** — backward compatible constraint
2. **No direct RLS UPDATE for employees** — all mutations via admin client (prevents column tampering)
3. **Sender = admin/accountant only** — matches existing payroll auth pattern
4. **3-way period advancement:** failed > 0 → stay confirmed; sent > 0 → advance; sent = 0 → advance (all pre-confirmed)
5. **DB CHECK constraint** for dispute_count <= 2
6. **reminder_sent_at column** for idempotent reminders
7. **Auto-confirm payslips without employee email** — prevents finalize blocking
8. **Audit action = 'UPDATE'** with source field in newData (compatible with existing schema)

---

## Final Plan Location

`plans/.codex-review/email-confirmation-plan.md` (v2, Codex-reviewed)
