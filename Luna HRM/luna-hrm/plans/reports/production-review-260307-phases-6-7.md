# Production Readiness Review -- Phases 6-7

**Date:** 2026-03-07
**Reviewer:** code-reviewer agent
**Scope:** Phase 6 (Employee Profile + Evaluation) + Phase 7 (Polish + Localization)
**Purpose:** Final gate before deploy. Verify previous P0/P1 fixes + find remaining issues.

**Verdict: CONDITIONAL APPROVE**

All previous P0/P1 fixes verified as correctly applied. Two new P1 issues found and one P0 carry-over from Phase 2 that was missed. No blockers for a soft launch, but the P1s should be addressed within the first maintenance window.

---

## Fix Verification Matrix

### Phase 6 Fixes

| # | Fix | File | Applied? | Correct? | Notes |
|---|-----|------|----------|----------|-------|
| P0-1 | `updateEmployeeProfile` import instead of `updateEmployee` | `components/employees/employee-profile-info.tsx:15` | YES | YES | Imports from `employee-profile-actions.ts`, uses PROFILE_FIELDS whitelist |
| P0-2 | Score bounds validation (0 to max_score) | `lib/actions/evaluation-save-actions.ts:81-86` | YES | YES | Iterates scores, checks `s.score < 0 \|\| s.score > crit.max_score` |
| P0-3 | Weighted total (score x weight) on both client + server | `evaluation-save-actions.ts:90-94`, `evaluation-form.tsx:78-81` | YES | YES | Both use `score * weight` with fallback `weight ?? 1` |
| P0-4 | Block criteria edit if evaluations exist | `evaluation-template-actions.ts:165-171` | YES | YES | Counts `employee_evaluations` by `template_id`, returns error if > 0 |
| P1-1 | applies_to + is_active validation | `evaluation-save-actions.ts:43-57`, `evaluation-form.tsx:54-57` | YES | YES | Server validates template `is_active` + `applies_to` vs employee position; form filters client-side |
| P1-2 | Shared `checkBmBranchAccess` helper | `lib/actions/branch-access-helpers.ts` | YES | YES | Used in `evaluation-actions.ts` (2x), `evaluation-save-actions.ts` (1x), `employee-notes-actions.ts` (3x) |
| P1-3 | Period status='open' check on evaluation save | `evaluation-save-actions.ts:60-65` | YES | YES | Fetches period, rejects if `status !== 'open'` |
| P1-5 | Template rollback on criteria insert failure | `evaluation-template-actions.ts:127-131` | YES | YES | `createEvaluationTemplate` deletes orphaned template row if criteria insert fails |

### Phase 7 Fixes

| # | Fix | File | Applied? | Correct? | Notes |
|---|-----|------|----------|----------|-------|
| P0-1 | `createAdminClient()` in audit-log-service | `lib/services/audit-log-service.ts:9,28` | YES | YES | Imports from `@/lib/supabase/admin`, uses service-role key to bypass RLS |
| P0-2 | File size 2MB + 500-row limit | `excel-import-dialog.tsx:58-59,86-97`, `class-schedule-import-actions.ts:23,40-41` | YES | YES | Client: 2MB + 500 rows. Server: 500 rows. Double enforcement. |
| P0-3 | Batch `.insert(validInserts)` | `class-schedule-import-actions.ts:88` | YES | YES | Single batch insert, no N+1 loop |
| P1-1 | Excel parser try/catch + empty sheet guard | `excel-schedule-parser.ts:49-53,122-124` | YES | YES | Outer try/catch returns friendly error; checks `SheetNames.length` and null sheet |
| P1-2 | logAudit accepts userId/userEmail from caller | `audit-log-service.ts:13-14,36-37` | YES | YES | All 5 callers pass `userId: user.id, userEmail: user.email` |
| P1-3 | `ALLOWED_UPDATE_FIELDS` in updateEmployee | `employee-mutation-actions.ts:106-110` | YES | YES | Set of 10 allowed fields, filters all others |
| P1-4 | Audit logging on batch import | `class-schedule-import-actions.ts:101-110` | YES | YES | `logAudit()` called after successful import with batch_count |

**All 15 fixes verified: 15/15 correctly applied.**

---

## [P0] Critical -- Must fix before deploy

**No new P0 issues found.** All previous P0s verified as resolved.

---

## [P1] High -- Should fix before deploy

### P1-NEW-1: `weekly-reminder` cron still uses `!==` for CRON_SECRET (timing attack)

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\app\api\cron\weekly-reminder\route.ts:14`

**Problem:** The KPI reminder cron route was correctly updated to use `timingSafeEqual` (verified at `app/api/cron/kpi-reminder/route.ts:9-15`), but the weekly-reminder cron route still uses plain `!==` string comparison for the `CRON_SECRET`. This creates a timing side-channel where an attacker can infer the secret byte-by-byte by measuring response times.

**Current code:**
```typescript
const secret = request.headers.get('x-cron-secret')
if (secret !== process.env.CRON_SECRET) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**Fix:** Apply the same `timingSafeEqual` pattern used in `kpi-reminder/route.ts`:
```typescript
import { timingSafeEqual } from 'crypto'

function verifyCronSecret(provided: string | null): boolean {
  const expected = process.env.CRON_SECRET
  if (!provided || !expected) return false
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
}
```

**Impact:** Low practical risk (cron endpoints are internal) but inconsistent with the KPI fix, and this was a P0 finding in the Phase 4 review.

---

### P1-NEW-2: Evaluation save allows admin to evaluate non-existent employee (no emp existence check)

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\evaluation-save-actions.ts:53-56`

**Problem:** When the template `applies_to === 'all'`, the condition `tmpl.applies_to !== 'all'` is false, so the entire `if` block is skipped -- even if `emp` is null (employee not found). For BM users, `checkBmBranchAccess` already validates that the employee exists (line 39). But for admin users, there is no existence check. If an admin passes a random UUID as `employee_id`, the `employee_evaluations` INSERT would fail at the DB level with a generic FK violation error.

**Current code:**
```typescript
const { data: emp } = await sb
  .from('employees').select('position').eq('id', input.employee_id).maybeSingle()
if (tmpl.applies_to !== 'all' && tmpl.applies_to !== emp?.position) {
  return { success: false, error: 'Mau danh gia khong phu hop...' }
}
```

**Fix:** Add explicit existence check before the applies_to condition:
```typescript
const { data: emp } = await sb
  .from('employees').select('position, is_active').eq('id', input.employee_id).maybeSingle()
if (!emp) return { success: false, error: 'Nhan vien khong ton tai.' }
if (!emp.is_active) return { success: false, error: 'Nhan vien da nghi viec.' }
if (tmpl.applies_to !== 'all' && tmpl.applies_to !== emp.position) {
  return { success: false, error: 'Mau danh gia khong phu hop...' }
}
```

**Impact:** Medium -- would only produce a confusing generic error; DB FK constraint prevents actual data corruption. Adding `is_active` check is a good defensive practice too.

---

## [P2] Medium -- Fix post-launch

### P2-1: Three files exceed 200-line limit

| File | Lines | Over by |
|------|-------|---------|
| `lib/actions/evaluation-template-actions.ts` | 220 | 20 |
| `components/evaluations/evaluation-form.tsx` | 226 | 26 |
| `components/class-schedules/excel-import-dialog.tsx` | 205 | 5 |

**Fix:** Split `evaluation-template-actions.ts` into `evaluation-template-query-actions.ts` (reads) and `evaluation-template-mutation-actions.ts` (create/update/deactivate), following the same pattern as `employee-query-actions.ts` / `employee-mutation-actions.ts`. The `evaluation-form.tsx` could extract the initialization/data-loading logic into a custom hook.

### P2-2: `messages.ts` i18n constants are dead code

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\constants\messages.ts`

**Problem:** The `MESSAGES` constant is defined (134 lines) but no component imports or uses it. All user-facing strings remain inline Vietnamese. The file was meant to establish a centralized i18n pattern but was never adopted.

**Recommendation:** Either import `MESSAGES` in new Phase 6-7 components to establish the pattern incrementally, or document it as "planned for post-MVP" and remove the dead import to avoid confusion.

### P2-3: `updateEvaluationTemplate` criteria replacement is non-atomic

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\evaluation-template-actions.ts:164-188`

**Problem:** The update flow is: (1) update template row, (2) check if evaluations exist, (3) delete old criteria, (4) insert new criteria. Steps 3-4 are not atomic -- if the insert at step 4 fails, the old criteria are already deleted, leaving the template with 0 criteria. Unlike `createEvaluationTemplate` which has rollback logic, `updateEvaluationTemplate` has no rollback for the delete+insert pair.

**Impact:** Low -- step 2 blocks this path when evaluations exist (the most common cause of FK failures). But for a template with no evaluations, a criteria insert failure would orphan the template. Consider wrapping in a Supabase RPC/transaction if available, or re-inserting old criteria on failure.

### P2-4: Employee form allows edit via `updateEmployee` with `is_active` field

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\employee-mutation-actions.ts:106-110`

**Problem:** The `ALLOWED_UPDATE_FIELDS` includes `is_active`. The `employee-form.tsx` does not send `is_active` in its payload (line 67-77), but any caller of `updateEmployee()` can pass `{ is_active: false }` to deactivate an employee. This is intentional (admin can deactivate employees), but there is no confirmation dialog or separate action for this. No actual bug, but worth noting for UX.

### P2-5: No content length limit on employee notes

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\employee-notes-actions.ts:70`

**Problem:** The `createEmployeeNote` action validates that content is not empty (`!input.content.trim()`) but does not limit the length. A user could paste arbitrarily large text. The DB column is `TEXT` (unlimited). Consider adding a reasonable limit (e.g., 5000 chars) to prevent abuse.

---

## [P3] Low -- Nice to have

### P3-1: `as any` casts on Supabase client throughout all actions

Recurring pattern across all files: `const sb = supabase as any`. This is a known type safety gap documented in memory. Not fixable until Supabase generates proper types from the schema.

### P3-2: `evaluation-form.tsx` parallel useEffect race condition (theoretical)

**File:** `components/evaluations/evaluation-form.tsx:45-62`

The `init()` function calls 3 actions in parallel via `Promise.all`. If `getEmployeeById` fails or is slow, `empPosition` defaults to `null`, and template filtering uses `tmpl.applies_to === empPosition` which would match nothing except `applies_to === 'all'`. This is a graceful degradation (shows fewer templates), not a crash. Acceptable for MVP.

### P3-3: `evaluation-detail-view.tsx` does not show weighted score per criterion

The detail view shows `score/max_score` per criterion but does not display the weight factor. If weights differ (e.g., some criteria weighted 2x), the user cannot understand how the total was computed from the detail view alone.

### P3-4: Excel export `periodName` parameter is unused

**File:** `lib/utils/excel-payroll-export.ts:116`

The `_periodName` parameter is accepted but explicitly unused (ESLint comment). It was intended for embedding in the file but was not implemented. Dead parameter.

---

## Edge Cases Found by Scout

1. **Evaluation with 0 criteria:** Handled -- `createEvaluationTemplate` rejects `criteria.length === 0` (line 104). `updateEvaluationTemplate` allows 0 criteria (line 177: `if (criteria.length > 0)`) which means you can empty a template's criteria list. Not harmful since the template becomes useless for scoring, but inconsistent with create behavior.

2. **Template with all weights = 0:** Allowed by code. Each weight defaults to `1.0`, but user can set `0.1` minimum in form (step="0.1"). If user explicitly sets all weights to 0, total score = 0 regardless of individual scores. This is mathematically correct but may confuse users. No action needed.

3. **Excel import with 0 valid rows:** Handled -- `handleImport()` checks `parseResult.valid.length === 0` and disables button. Server-side: `validInserts.length > 0` guard prevents empty batch insert.

4. **Audit log with very large newData payload:** Not capped. The `JSONB` column accepts arbitrarily large payloads. Current callers pass small objects (employee_code, batch_count, etc.), so not a practical risk.

5. **Profile update with empty/null fields:** Handled -- `updateEmployeeProfile` filters to PROFILE_FIELDS whitelist, sends null for empty strings. DB columns are nullable for these fields.

6. **BM with null branch_id:** The `checkBmBranchAccess` compares `emp.branch_id !== userBranchId` where `userBranchId` can be null. If both are null, access is granted. This is technically correct (a BM without branch assignment can only see employees without branch assignment). Edge case but not exploitable.

---

## Production Checklist

| Check | Status |
|-------|--------|
| All P0 fixes from Phase 6 review applied | PASS |
| All P0 fixes from Phase 7 review applied | PASS |
| All P1 fixes from Phase 6 review applied | PASS |
| All P1 fixes from Phase 7 review applied | PASS |
| BM branch scoping enforced in all mutation actions | PASS |
| Employee role access control consistent | PASS |
| PROFILE_FIELDS whitelist prevents privilege escalation | PASS |
| ALLOWED_UPDATE_FIELDS prevents column injection | PASS |
| Audit log uses service-role client (bypasses RLS) | PASS |
| Excel import has client+server size/row limits | PASS |
| Score validation bounds-checked server-side | PASS |
| Weighted total calculated consistently client+server | PASS |
| Template FK guard prevents criteria edit with evaluations | PASS |
| Template creation rolls back on criteria failure | PASS |
| Period status checked before evaluation save | PASS |
| `timingSafeEqual` on all cron routes | FAIL (weekly-reminder) |
| Employee existence validated in evaluation save | FAIL (admin path) |
| All files under 200-line limit | FAIL (3 files) |

---

## Positive Observations

1. **Consistent BM scoping pattern.** The `checkBmBranchAccess` shared helper is well-extracted and used uniformly across all 3 action files (6 call sites). Clean, DRY, correct.

2. **Defense in depth on profile updates.** Two separate actions (`updateEmployee` for core fields, `updateEmployeeProfile` for extended fields) with independent whitelists. The profile info component correctly uses the safe action.

3. **Double-layer size limits on Excel import.** Client-side (2MB file size + 500 row count) and server-side (500 row count) prevent bypass via direct server action calls.

4. **Audit log architecture is sound.** Using `createAdminClient()` with service-role key cleanly bypasses RLS. Fire-and-forget pattern with try/catch prevents audit failures from blocking business operations. Caller-provided user info eliminates redundant auth calls.

5. **Template deactivation pattern.** Instead of delete (which would cascade/fail), templates are deactivated via `is_active: false`. Evaluation save validates `is_active` before use. Clean soft-delete approach.

6. **Rollback on create failure.** Both `createEvaluationTemplate` (rolls back template if criteria insert fails) and `createEmployee` (rolls back auth user if DB insert fails) implement proper compensation logic.

7. **Score input UX.** `EvaluationScoreInput` component clamps values to `[0, maxScore]` on change, with step=0.5 granularity. Server validates independently. Both layers protect data integrity.

---

## Metrics

- **Files reviewed:** 34 (24 Phase 6 + 10 Phase 7)
- **Total LOC reviewed:** ~3,200
- **Fixes verified:** 15/15 (100%)
- **New findings:** 0 P0, 2 P1, 5 P2, 4 P3
- **Files over 200 lines:** 3 (evaluation-template-actions 220, evaluation-form 226, excel-import-dialog 205)
- **Type safety gaps:** `as any` on Supabase client (known systemic issue)
- **Dead code:** messages.ts unused, _periodName unused parameter
- **Security controls verified:** PROFILE_FIELDS whitelist, ALLOWED_UPDATE_FIELDS, BM branch scoping, audit log RLS, service-role insert, cron secret (1 of 2 routes fixed)

---

## Recommended Actions (Priority Order)

1. **[P1-NEW-1]** Apply `timingSafeEqual` to `weekly-reminder/route.ts` (5 minutes, copy from `kpi-reminder/route.ts`)
2. **[P1-NEW-2]** Add `if (!emp)` existence check in `evaluation-save-actions.ts:55` (2 minutes)
3. **[P2-1]** Split `evaluation-template-actions.ts` into query + mutation files (15 minutes)
4. **[P2-5]** Add content length limit to `createEmployeeNote` (2 minutes)
5. **[P2-3]** Add rollback logic to `updateEvaluationTemplate` criteria replacement (10 minutes)
6. **[P2-2]** Either adopt `messages.ts` in components or document as planned post-MVP (decision needed)

---

## Unresolved Questions

1. **Should `evaluation-form.tsx` allow submitting 0 scores (all defaults)?** Currently allowed. A user could create an evaluation with all criteria scored 0 and empty comments. This may be intentional (marking an evaluation as "not performed") or accidental.

2. **Should deactivated employees be evaluatable?** The save action does not check `emp.is_active`. An admin could evaluate a former employee. This might be intentional for historical records.

3. **Template `applies_to` mismatch with DB positions:** Template targets include `'teacher' | 'assistant' | 'office' | 'all'` but DB `employees.position` also allows `'admin'`. An admin-position employee would only match templates with `applies_to = 'all'`. Is this intentional?
