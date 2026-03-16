# Plan: Email Notification + Employee Confirmation Workflow (v2 — Post-Codex R1)

**Project:** Luna HRM
**Architecture:** Option C — Hybrid (Email Service + Payroll Integration)
**Email Provider:** Resend (free 100/day)
**Dispute Limit:** 2 max (DB-enforced CHECK constraint)
**Auto-confirm:** After 3 days no response

---

## Decisions Confirmed

| Decision | Value |
|-----------|---------|
| Architecture | Hybrid: shared email service + payroll-specific actions |
| Email provider | Resend (`resend` npm package) |
| Max disputes | 2 per payslip per period (DB CHECK constraint) |
| Auto-confirm | 3 days after sending, reminder at day 2 |
| PDF attachment | No (HTML email + link app — YAGNI) |
| New tables | 0 (extend payslips + payroll_periods) |
| Sender role | admin/accountant only (NOT BM — matches existing payroll auth) |

---

## Existing Codebase Context

### Current payroll_periods.status constraint
- Current allowed values: `'draft' | 'confirmed' | 'sent'` (in DB + database-payroll-types.ts)
- Plan adds: `'pending_confirmation' | 'finalized'` — KEEPS `'sent'` for backward compatibility

### Current Payslip type (database-payroll-types.ts)
- Has `email_sent_at: string | null` already
- Needs new columns: `employee_status`, `employee_confirmed_at`, `employee_feedback`, `confirmation_token`, `dispute_count`, `reminder_sent_at`

### Existing migrations: 000-011, next: 012

### Auth pattern
- `getCurrentUser()` from auth-actions
- Admin client: `createAdminClient()` from lib/supabase/admin
- RLS via app_metadata: role, branch_id
- Payroll actions: admin/accountant ONLY (NOT BM — BM is read-only for payroll)

### Action pattern
- Server actions with `'use server'` directive
- Returns `ActionResult<T> = { success: boolean; data?: T; error?: string }`

---

## Workflow State Machine

```
payroll_periods.status:
  'draft' → 'confirmed' → 'pending_confirmation' → 'finalized'
  (also: 'sent' kept for backward compatibility)

payslips.employee_status:
  'pending' → 'sent' → 'confirmed' | 'disputed' → 'sent' (resend) → 'confirmed'
                                                          ↑ max 2 disputes (DB CHECK)

Auto-confirm trigger:
  Cron daily → find payslips WHERE employee_status='sent'
    AND email_sent_at < NOW() - INTERVAL '3 days'
    → auto set employee_status='confirmed', employee_confirmed_at=NOW()
```

---

## Phase 1: Database Schema + Email Service Setup

### Migration 012

**File:** `supabase/migrations/012_employee_payslip_confirmation.sql`

```sql
-- Payslips: employee confirmation tracking
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS employee_status VARCHAR(20) DEFAULT 'pending'
  CHECK (employee_status IN ('pending','sent','confirmed','disputed'));
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS employee_confirmed_at TIMESTAMPTZ;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS employee_feedback TEXT;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS confirmation_token UUID DEFAULT gen_random_uuid();
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS dispute_count INT DEFAULT 0
  CHECK (dispute_count >= 0 AND dispute_count <= 2);  -- ISSUE-8: DB-enforced cap
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;  -- ISSUE-6: idempotent reminder
-- email_sent_at already exists

-- Payroll periods: confirmation deadline + new statuses (KEEPS 'sent' — ISSUE-1)
ALTER TABLE payroll_periods DROP CONSTRAINT IF EXISTS payroll_periods_status_check;
ALTER TABLE payroll_periods ADD CONSTRAINT payroll_periods_status_check
  CHECK (status IN ('draft','confirmed','sent','pending_confirmation','finalized'));
ALTER TABLE payroll_periods ADD COLUMN IF NOT EXISTS confirmation_deadline TIMESTAMPTZ;

-- ISSUE-2: SECURITY DEFINER function for employee confirm/dispute (prevents column tampering)
-- Employee updates go through server actions using createAdminClient(), NOT direct RLS UPDATE
-- No direct UPDATE RLS policy for employees on payslips — all mutations via admin client

-- Index for cron auto-confirm query
CREATE INDEX IF NOT EXISTS idx_payslips_employee_status ON payslips(employee_status);
CREATE INDEX IF NOT EXISTS idx_payslips_email_sent_at ON payslips(email_sent_at);
```

### TypeScript Type Updates

**File:** `lib/types/database-payroll-types.ts` — EXTEND

```typescript
// Update PayrollStatus to include new statuses (ISSUE-1: keep 'sent')
export type PayrollStatus = 'draft' | 'confirmed' | 'sent' | 'pending_confirmation' | 'finalized'

// Add to Payslip interface:
employee_status: 'pending' | 'sent' | 'confirmed' | 'disputed'
employee_confirmed_at: string | null
employee_feedback: string | null
confirmation_token: string
dispute_count: number
reminder_sent_at: string | null
```

### Resend Setup

**File:** `package.json` — add `resend` dependency
**File:** `.env.local` — add `RESEND_API_KEY=re_xxxx`

### Email Service (shared, reusable)

**File:** `lib/services/email-service.ts` (~80 lines)

```typescript
export async function sendEmail(params: {
  to: string
  subject: string
  html: string
  replyTo?: string
}): Promise<{ success: boolean; messageId?: string; error?: string }>

// Features:
// - Resend SDK wrapper
// - Error handling with retry (1 retry on failure)
// - Rate limiting awareness (100/day)
// - Logging: console.log for success, console.error for failure
// - Returns result (caller decides on fire-and-forget or await)
```

### Email Templates (shared)

**File:** `lib/services/email-templates.ts` (~120 lines)

```typescript
export function buildPayslipEmailHtml(params: {
  employeeName: string
  month: number
  year: number
  payslipBreakdown: PayslipBreakdown
  confirmUrl: string
  disputeUrl: string
  deadline: string
}): string

export function buildReminderEmailHtml(params: {
  employeeName: string
  month: number
  year: number
  deadline: string
  confirmUrl: string
}): string
```

---

## Phase 2: Payroll Notification Actions

### Send Payslip Emails

**File:** `lib/actions/payroll-notification-actions.ts` (~150 lines)

```typescript
// ISSUE-3: sender = admin/accountant only (matches existing payroll auth)
// ISSUE-7: uses ActionResult<T> pattern consistently

export async function sendPayslipEmails(periodId: string): Promise<ActionResult<{
  sent: number
  failed: number
  errors: string[]
}>>
// Steps:
// 1. Verify period status = 'confirmed' and caller is admin/accountant
// 2. Fetch all payslips for period with employee email + name
// 3. Guard: payslips without valid employee email → auto-confirm immediately
//    (employee_status='confirmed', employee_confirmed_at=now(), audit: 'no employee email')
//    These do NOT count as failures — they are pre-confirmed
// 4. For each payslip with valid email:
//    a. Build email HTML (payslip breakdown)
//    b. Generate confirm URL: /my-payslips/{id}?token={confirmation_token}
//    c. Send via email-service with 100ms delay between emails
//    d. On success: update employee_status='sent', email_sent_at=now()
//    e. On failure: log error, continue to next (don't abort batch)
// 5. Period advancement logic (ISSUE-4):
//    If failed > 0: keep period as 'confirmed', return errors for retry
//    If sent > 0 AND failed === 0: update period status='pending_confirmation', deadline=now()+3days
//    If sent === 0 AND failed === 0 (all payslips auto-confirmed, no sendable emails):
//      update period status='pending_confirmation' immediately (all already confirmed)
// 6. Audit log
// 7. Return ActionResult with { sent, failed, errors }

export async function resendPayslipEmail(payslipId: string): Promise<ActionResult>
// For single payslip resend (admin/accountant fixes and resends)
// Reset: employee_status='sent', employee_feedback=null, email_sent_at=now()
// reminder_sent_at=null (reset reminder tracking)
// dispute_count NOT reset (keeps accumulating)
// Uses admin client for column-safe update (ISSUE-2)
```

### Finalize Payroll Period

**File:** `lib/actions/payroll-period-actions.ts` — EXTEND

```typescript
export async function finalizePayrollPeriod(periodId: string): Promise<ActionResult>
// Steps:
// 1. Verify caller is admin/accountant
// 2. Verify period status = 'pending_confirmation'
// 3. Check ALL payslips have employee_status = 'confirmed'
// 4. ISSUE-4: if any payslip NOT confirmed, return error with count
// 5. Update: status = 'finalized'
// 6. Audit log
// 7. Period is now immutable (no undo — no undoPayrollPeriod for finalized)
```

---

## Phase 3: Employee Confirmation Actions + UI

### Employee Actions

**File:** `lib/actions/employee-confirmation-actions.ts` (~100 lines)

```typescript
// ISSUE-2: Uses createAdminClient() for mutations, not direct RLS
// ISSUE-7: Returns ActionResult consistently

export async function confirmMyPayslip(
  payslipId: string, token: string
): Promise<ActionResult>
// Steps:
// 1. Verify current user is authenticated
// 2. Use admin client to fetch payslip (bypass RLS for token check)
// 3. Verify token matches payslip.confirmation_token
// 4. Verify payslip.employee_id = current user
// 5. Verify employee_status IN ('sent', 'disputed')
// 6. Admin client update: employee_status='confirmed', employee_confirmed_at=now()
// 7. Audit log (with user ID for traceability)

export async function disputeMyPayslip(
  payslipId: string, token: string, feedback: string
): Promise<ActionResult>
// Steps:
// 1. Verify token + ownership (same as confirm)
// 2. Check dispute_count < 2 (app-level + DB CHECK constraint — ISSUE-8)
// 3. Admin client update: employee_status='disputed', employee_feedback=feedback, dispute_count+=1
// 4. Send email to admin/accountant: "NV {name} yeu cau dieu chinh bang luong thang X"
// 5. Audit log
```

### Employee Portal UI Extension

**File:** `app/(dashboard)/my-payslips/[id]/page.tsx` — EXTEND

```
Current: Read-only payslip view
Add:
- If employee_status='sent' or 'disputed':
  - [Xac nhan bang luong] button (green)
  - [Phan hoi dieu chinh] button (orange) → opens textarea
  - Show deadline: "Vui long xac nhan truoc DD/MM/YYYY"
  - Show dispute count: "Da phan hoi X/2 lan"
- If employee_status='confirmed':
  - Badge: "Da xac nhan" + confirmed_at timestamp
- If employee_status='disputed':
  - Badge: "Dang cho dieu chinh"
  - Show previous feedback
```

### Payroll Spreadsheet UI Extension

**File:** `components/payroll/payroll-spreadsheet.tsx` — EXTEND

```
Add employee_status badge per row:
- 'pending': gray badge "Chua gui"
- 'sent': blue badge "Da gui"
- 'confirmed': green badge "NV xac nhan"
- 'disputed': orange badge "NV phan hoi" + tooltip with feedback
```

### PayrollStatusBadge Update

**File:** `components/payroll/payroll-status-badge.tsx` — EXTEND
- Add `pending_confirmation` and `finalized` status configs (ISSUE-1)

### BM/Admin Actions UI

**File:** `app/(dashboard)/payroll/[period]/page.tsx` — EXTEND

```
Add buttons:
- "Gui email cho NV" (appears when status='confirmed', role=admin/accountant)
- "Chot bang luong" (appears when status='pending_confirmation' AND all employee_status='confirmed')
- Per-payslip: "Gui lai" button for disputed payslips
- Summary bar: "X/Y NV da xac nhan"
- ISSUE-4: Show failed email count with retry button if partial failure
```

---

## Phase 4: Auto-confirm Cron + Reminder

### Auto-confirm Cron

**File:** `app/api/cron/auto-confirm-payslips/route.ts` (~60 lines)

```typescript
// GET /api/cron/auto-confirm-payslips
// Security: x-cron-secret header (timing-safe)
// Trigger: Daily at 9:00 AM
// Logic:
// 1. Find payslips WHERE employee_status='sent'
//    AND email_sent_at < NOW() - INTERVAL '3 days'
// 2. Auto-confirm: employee_status='confirmed', employee_confirmed_at=NOW()
// 3. Audit log: action='UPDATE', newData includes { employee_status: 'confirmed', source: 'auto_confirm_cron' }
// 4. Log auto-confirmed count
```

### Reminder Cron (day 2)

**File:** `app/api/cron/payslip-reminder/route.ts` (~50 lines)

```typescript
// GET /api/cron/payslip-reminder
// Security: x-cron-secret header
// Trigger: Daily at 9:00 AM
// Logic:
// 1. Find payslips WHERE employee_status='sent'
//    AND email_sent_at BETWEEN NOW() - 48h AND NOW() - 24h
//    AND reminder_sent_at IS NULL  -- ISSUE-6: idempotent, skip already-reminded
// 2. Send reminder email
// 3. Update: reminder_sent_at = NOW()  -- ISSUE-6: mark as reminded
// 4. Log reminder count
```

---

## Phase 5: Testing + Docs Update

### Tests

**File:** `tests/email-confirmation.test.ts`

```
Test cases:
- confirmMyPayslip: valid token → confirmed
- confirmMyPayslip: invalid token → rejected
- confirmMyPayslip: wrong employee → rejected
- disputeMyPayslip: under limit → accepted
- disputeMyPayslip: at limit (2) → rejected (app-level + DB constraint)
- auto-confirm: past deadline → auto-confirmed
- finalizePayrollPeriod: all confirmed → success
- finalizePayrollPeriod: some unconfirmed → blocked
- sendPayslipEmails: partial failure → period stays 'confirmed', errors returned (ISSUE-4)
- sendPayslipEmails: all success → period advances to 'pending_confirmation'
- sendPayslipEmails: payslip without email → auto-confirmed immediately
- sendPayslipEmails: all payslips have no email → period advances to 'pending_confirmation'
- payslip-reminder: already reminded (reminder_sent_at not null) → not re-sent
```

---

## File Summary

| File | Action | Lines (est.) |
|------|--------|:---:|
| `supabase/migrations/012_employee_payslip_confirmation.sql` | NEW | ~35 |
| `lib/services/email-service.ts` | NEW | ~80 |
| `lib/services/email-templates.ts` | NEW | ~120 |
| `lib/actions/payroll-notification-actions.ts` | NEW | ~150 |
| `lib/actions/employee-confirmation-actions.ts` | NEW | ~100 |
| `app/api/cron/auto-confirm-payslips/route.ts` | NEW | ~60 |
| `app/api/cron/payslip-reminder/route.ts` | NEW | ~50 |
| `tests/email-confirmation.test.ts` | NEW | ~120 |
| `lib/types/database-payroll-types.ts` | EXTEND | +10 |
| `lib/actions/payroll-period-actions.ts` | EXTEND | +30 |
| `app/(dashboard)/my-payslips/[id]/page.tsx` | EXTEND | +50 |
| `components/payroll/payroll-spreadsheet.tsx` | EXTEND | +30 |
| `components/payroll/payroll-status-badge.tsx` | EXTEND | +10 |
| `app/(dashboard)/payroll/[period]/page.tsx` | EXTEND | +40 |
| `package.json` | EXTEND | +1 |
| **Total new code** | | **~900 lines** |

---

## Risks & Mitigations

| Risk | Mitigation |
|--------|------------|
| Email goes to spam | Verify domain on Resend (DKIM/SPF/DMARC) |
| Token verification | UUID per payslip + ownership check + employee_status guard |
| Employee has no email | Auto-confirm immediately (employee_status='confirmed'), log warning |
| Resend rate limit | Batch send with 100ms delay between emails |
| Concurrent disputes | DB CHECK constraint (dispute_count <= 2) + app-level check |
| Auto-confirm wrong | Audit log: "auto-confirmed after 3 days", traceability via audit_logs |
| Partial send failure | Period stays 'confirmed', errors returned, retry button in UI |
| Duplicate reminders | reminder_sent_at column prevents re-sending |
| Employee column tampering | Admin client for all employee mutations, no direct RLS UPDATE |
