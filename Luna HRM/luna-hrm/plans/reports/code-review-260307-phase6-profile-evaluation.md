# Code Review: Phase 6 -- Employee Profile + Evaluation System

**Date:** 2026-03-07
**Reviewer:** code-reviewer agent
**Scope:** Phase 6 -- 24 files (7 server actions, 8 components, 4 pages, 5 type files)
**Build:** PASSES (tsc + next build clean)
**Verdict:** 4 P0, 5 P1, 7 P2, 4 P3

---

## Summary

Phase 6 implements evaluation templates, periods, employee evaluations with per-criterion scoring, ad-hoc employee notes, and extended profile editing. The architecture is clean and well-organized, with proper barrel exports, consistent Vietnamese UI labels, and correct RLS policies at the database level. However, there are **4 critical issues** that must be fixed before production: a privilege escalation vector in profile updates, missing server-side score validation, a broken weighted-score calculation, and a non-atomic template update that will crash when evaluations exist.

---

## [P0] Critical -- Must Fix Before Production

### P0-1: Privilege Escalation -- Profile Update Uses Unrestricted `updateEmployee`

**Files:**
- `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\components\employees\employee-profile-info.tsx` (line 15, 74)
- `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\employee-profile-actions.ts` (unused)

**Description:**
`employee-profile-info.tsx` imports and calls `updateEmployee` from `employee-actions.ts` (line 15), which is the general-purpose employee mutation that allows updating **any field** including `role`, `position`, `branch_id`, `is_active`. A dedicated `updateEmployeeProfile` action exists in `employee-profile-actions.ts` with a `PROFILE_FIELDS` whitelist that explicitly prevents updating authority fields, but **it is never imported or used by any component**.

While the current form only sends profile fields, a malicious client can intercept the server action call and inject `role: 'admin'` into the payload. The `updateEmployee` action does NOT strip dangerous fields for BM callers -- it only checks `BM_ALLOWED_ROLES` if `data.role !== undefined`, but a BM could still pass `is_active`, `position`, etc.

**Impact:** Branch manager could escalate own or others' privileges via crafted request.

**Fix:**
```typescript
// employee-profile-info.tsx line 15
- import { updateEmployee } from '@/lib/actions/employee-actions'
+ import { updateEmployeeProfile } from '@/lib/actions/employee-profile-actions'

// line 74
- const result = await updateEmployee(employee.id, {
+ const result = await updateEmployeeProfile(employee.id, {
```

---

### P0-2: No Server-Side Score Validation -- Scores Can Exceed max_score or Be Negative

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\evaluation-save-actions.ts` (lines 57-85)

**Description:**
The `createEvaluation` action stores scores directly from client input with zero validation:
1. No check that `score >= 0` for each criterion
2. No check that `score <= criterion.max_score`
3. No DB-level CHECK constraint on `evaluation_scores.score` (only `DEFAULT 0`)
4. Client-side clamping in `evaluation-score-input.tsx` (line 32-34) can be bypassed

A client can submit `score: 999` or `score: -50` for any criterion. The DB will accept it.

**Impact:** Data integrity violation. Total scores become meaningless. Could be exploited to inflate/deflate evaluations.

**Fix:** Add server-side validation in `createEvaluation`:
```typescript
// After line 55, before totalScore calculation
// Fetch criteria to validate scores
const { data: tmplCriteria, error: tmplErr } = await sb
  .from('evaluation_criteria')
  .select('id, max_score')
  .eq('template_id', input.template_id)
if (tmplErr) throw tmplErr

const criteriaMap = new Map(
  (tmplCriteria ?? []).map((c: { id: string; max_score: number }) => [c.id, c.max_score])
)

for (const s of input.scores) {
  const maxScore = criteriaMap.get(s.criterion_id)
  if (maxScore === undefined) {
    return { success: false, error: `Tiêu chí không tồn tại: ${s.criterion_id}` }
  }
  if (s.score < 0 || s.score > maxScore) {
    return { success: false, error: `Điểm phải từ 0 đến ${maxScore}.` }
  }
}
```

---

### P0-3: Total Score Ignores Criterion Weights -- Wrong Calculation

**Files:**
- `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\evaluation-save-actions.ts` (line 57)
- `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\components\evaluations\evaluation-form.tsx` (line 65)

**Description:**
The spec states "Evaluation score = weighted sum of criteria scores" and criteria have a `weight` column (NUMERIC, default 1.0). However, the total score calculation in both the save action and the form is:
```typescript
const totalScore = input.scores.reduce((sum, s) => sum + (s.score ?? 0), 0)
```
This is a raw sum that completely ignores weights. If criterion A has weight=2 and criterion B has weight=1, scoring 5 on each should yield `5*2 + 5*1 = 15`, not `5 + 5 = 10`.

**Impact:** Evaluations with non-uniform weights produce incorrect total scores. The `weight` field exists in the schema and UI but has zero effect on scoring.

**Fix:** The save action must fetch criteria weights and compute weighted sum:
```typescript
// In createEvaluation, after fetching criteria for validation:
let totalScore = 0
for (const s of input.scores) {
  const criterion = tmplCriteria.find((c: any) => c.id === s.criterion_id)
  totalScore += (s.score ?? 0) * (criterion?.weight ?? 1)
}
```
And the client preview should also use weights:
```typescript
// In evaluation-form.tsx
const totalScore = criteria.reduce((sum, c) => {
  const s = scores[c.id]?.score ?? 0
  return sum + s * c.weight
}, 0)
```

---

### P0-4: Template Criteria Update Crashes When Evaluations Exist (FK RESTRICT)

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\evaluation-template-actions.ts` (lines 160-174)

**Description:**
`updateEvaluationTemplate` performs a "delete-all-then-reinsert" strategy for criteria:
```typescript
const { error: delErr } = await sb.from('evaluation_criteria').delete().eq('template_id', id)
```
But `evaluation_scores.criterion_id` references `evaluation_criteria(id) ON DELETE RESTRICT` (migration line 390). If any evaluation has been scored against this template, the DELETE will fail with a FK violation error. The error is caught and returned as a generic message, but the template metadata may already be updated (line 152-158 runs before criteria replacement), leaving the template in an inconsistent state.

**Impact:** Admin cannot edit any template that has been used for evaluations. Partial template update (name/applies_to updated, criteria unchanged) on FK error.

**Fix:** Either:
1. Wrap in a transaction (Supabase doesn't easily support client-side transactions -- use `rpc()` with a PL/pgSQL function), or
2. Soft-update: match existing criteria by name/index, only delete unused ones, add new ones, or
3. Check for existing evaluations first and reject update if template is in use:
```typescript
const { count } = await sb
  .from('employee_evaluations')
  .select('id', { count: 'exact', head: true })
  .eq('template_id', id)
if (count && count > 0) {
  return { success: false, error: 'Không thể sửa tiêu chí -- mẫu đã có đánh giá. Vô hiệu và tạo mẫu mới.' }
}
```

---

## [P1] High -- Should Fix

### P1-1: No `applies_to` Validation -- Any Template Can Evaluate Any Position

**Files:**
- `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\evaluation-save-actions.ts` (lines 31-88)
- `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\components\evaluations\evaluation-form.tsx` (lines 44-48, 117-125)

**Description:**
Templates have an `applies_to` field (`teacher | assistant | office | all`), but neither the server action nor the client form validates that the selected template matches the target employee's position. A BM can evaluate a "teacher" employee using an "assistant" template.

**Fix:** In `createEvaluation`, after BM branch check:
```typescript
const { data: emp } = await sb.from('employees').select('position').eq('id', input.employee_id).maybeSingle()
const { data: tmpl } = await sb.from('evaluation_templates').select('applies_to, is_active').eq('id', input.template_id).maybeSingle()
if (!tmpl) return { success: false, error: 'Mẫu đánh giá không tồn tại.' }
if (!tmpl.is_active) return { success: false, error: 'Mẫu đánh giá đã vô hiệu.' }
if (tmpl.applies_to !== 'all' && tmpl.applies_to !== emp?.position) {
  return { success: false, error: 'Mẫu đánh giá không phù hợp với vị trí nhân viên.' }
}
```

And filter templates in the form:
```typescript
// evaluation-form.tsx, filter templates by position
if (t.success && t.data) {
  setTemplates(t.data.filter(tmpl => tmpl.applies_to === 'all' || tmpl.applies_to === employeePosition))
}
```

---

### P1-2: Duplicate `checkBmBranchAccess` Helper -- 3 Copies Across 3 Files

**Files:**
- `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\evaluation-actions.ts` (lines 17-28)
- `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\evaluation-save-actions.ts` (lines 16-27)
- `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\employee-notes-actions.ts` (lines 16-27, named `assertBmBranchAccess`)

**Description:**
Three nearly identical copies of the same branch-access helper. DRY violation. If the logic needs to change (e.g., add `is_active` check on target employee), all three must be updated independently.

**Fix:** Extract to a shared utility:
```typescript
// lib/actions/branch-access-helpers.ts
export async function checkBmBranchAccess(sb: any, employeeId: string, userBranchId: string | null): Promise<string | null> {
  const { data: emp } = await sb.from('employees').select('branch_id').eq('id', employeeId).maybeSingle()
  if (!emp) return 'Nhan vien khong ton tai.'
  if (emp.branch_id !== userBranchId) return 'Khong co quyen.'
  return null
}
```

---

### P1-3: No Validation That Evaluation Period Is Open When Submitting Periodic Evaluation

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\evaluation-save-actions.ts` (lines 59-74)

**Description:**
When `eval_type` is `periodic` and a `period_id` is provided, the server action does NOT verify that the period's status is `open`. A user could submit an evaluation against a `closed` period. The form filters to open periods client-side (line 47 of evaluation-form.tsx), but this can be bypassed.

**Fix:**
```typescript
if (input.period_id) {
  const { data: period } = await sb.from('evaluation_periods').select('status').eq('id', input.period_id).maybeSingle()
  if (!period) return { success: false, error: 'Ky danh gia khong ton tai.' }
  if (period.status !== 'open') return { success: false, error: 'Ky danh gia da dong.' }
}
```

---

### P1-4: No Template Active Status Check on Evaluation Save

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\evaluation-save-actions.ts`

**Description:**
A deactivated template (`is_active = false`) can still be used to create evaluations. The server action does not check `evaluation_templates.is_active` before inserting. The form loads all templates (including inactive ones via `getEvaluationTemplates` which returns all, not just active).

**Fix:** See P1-1 fix above (includes `is_active` check). Also filter in `getEvaluationTemplates` or in the form component.

---

### P1-5: Non-Atomic Template Creation -- Partial State on Criteria Insert Failure

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\evaluation-template-actions.ts` (lines 110-127)

**Description:**
`createEvaluationTemplate` first inserts the template (line 110-115), then inserts criteria (line 126). If criteria insertion fails (e.g., due to a constraint violation on `weight`), the template exists with 0 criteria -- orphaned record. There is no rollback.

Similarly, `updateEvaluationTemplate` updates the template, then deletes old criteria, then inserts new criteria -- three non-atomic operations.

**Impact:** Orphaned templates with no criteria. Inconsistent state.

**Fix:** Use Supabase RPC with a PL/pgSQL function for atomic operations, or at minimum, delete the orphaned template on criteria insert failure:
```typescript
if (critErr) {
  await sb.from('evaluation_templates').delete().eq('id', tmpl.id)
  throw critErr
}
```

---

## [P2] Medium -- Logic Error or Edge Case

### P2-1: `getEvaluationDetail` Fetches Full Data Before Auth Check (IDOR Pattern)

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\evaluation-actions.ts` (lines 102-126)

**Description:**
The function fetches the complete evaluation with all scores and criteria (lines 102-112), then checks employee ownership (line 118) and BM branch access (line 123). Although RLS should prevent cross-branch reads at the DB level, the application-level check is post-fetch. If RLS is misconfigured or bypassed (e.g., admin client used by mistake), data leaks before the access check runs.

**Fix:** Fetch minimal data first (just `employee_id`), verify access, then fetch full detail. Or rely entirely on RLS (which is correctly configured per review of `002_rls_policies.sql`).

---

### P2-2: Evaluation Periods Are Not Branch-Scoped

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\evaluation-period-actions.ts`
**DB Schema:** `evaluation_periods` table has no `branch_id` column

**Description:**
The requirements state periods should be "branch-scoped," but the `evaluation_periods` table has no `branch_id` column and the RLS policy grants BM SELECT access to ALL periods. All branches share the same periods. This may be intentional (global periods like "Q1 2026") but conflicts with the stated requirement.

**Impact:** If different branches need different evaluation cycles, the current design does not support it.

**Fix:** If branch-scoped periods are required, add `branch_id` to `evaluation_periods` and update RLS. If global periods are intentional, document this decision.

---

### P2-3: No Deduplication Check -- Same Employee Can Be Evaluated Multiple Times Per Period

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\evaluation-save-actions.ts`

**Description:**
There is no UNIQUE constraint on `(employee_id, period_id, template_id)` in the DB schema and no application-level check. A BM can submit 10 evaluations for the same employee in the same period. This could lead to confusing evaluation history.

**Fix:** Add either a DB UNIQUE constraint or an application-level check:
```typescript
if (input.period_id) {
  const { data: existing } = await sb.from('employee_evaluations')
    .select('id').eq('employee_id', input.employee_id)
    .eq('period_id', input.period_id).eq('template_id', input.template_id)
    .maybeSingle()
  if (existing) return { success: false, error: 'Nhan vien da duoc danh gia trong ky nay voi mau nay.' }
}
```

---

### P2-4: Client-Side Role Detection Race in Pages

**Files:**
- `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\app\(dashboard)\evaluation-templates\page.tsx` (lines 25-29, 40)
- `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\app\(dashboard)\evaluation-periods\page.tsx` (lines 25-29, 40)

**Description:**
Two parallel `useEffect` hooks run on mount: one fetches `getCurrentUser()` to set `isAdmin`, another fetches data. They race. If the data fetch completes before the role check, the "Create" button is hidden even for admin until the role check resolves. More importantly, the `isAdmin` state defaults to `false` -- there is a brief flash where admin-only controls are hidden.

**Fix:** Combine into a single `useEffect` or fetch user first, then data:
```typescript
useEffect(() => {
  async function init() {
    const u = await getCurrentUser()
    if (u?.role === 'admin') setIsAdmin(true)
    await fetchTemplates()
  }
  init()
}, [])
```

---

### P2-5: `evaluation-form.tsx` Exceeds 200-Line Limit (211 Lines)

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\components\evaluations\evaluation-form.tsx`

**Description:**
At 211 lines, this file exceeds the project's 200-line limit. The form state, data fetching, and rendering are all in one component.

**Fix:** Extract the data-fetching hooks (template/period loading, criteria loading) into a custom hook like `use-evaluation-form-data.ts`.

---

### P2-6: `evaluation-template-actions.ts` Exceeds 200-Line Limit (207 Lines)

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\evaluation-template-actions.ts`

**Description:** At 207 lines, slightly over the 200-line limit.

**Fix:** Extract read actions (lines 20-91) into `evaluation-template-query-actions.ts`.

---

### P2-7: No Content Length Validation on Notes and Evaluation Comments

**Files:**
- `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\employee-notes-actions.ts` (line 84)
- `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\evaluation-save-actions.ts`

**Description:**
Note `content` is checked for empty but has no maximum length. The `TEXT` column in PostgreSQL has no built-in limit. A user could submit megabytes of text. Similarly, evaluation `overall_notes` and per-criterion `comment` have no length limits.

**Fix:** Add length validation:
```typescript
if (input.content.trim().length > 5000) return { success: false, error: 'Noi dung qua dai (toi da 5000 ky tu).' }
```

---

## [P3] Low -- Style, Performance, Minor Improvement

### P3-1: `as any` Cast on Supabase Client Used Throughout All Phase 6 Actions

**Files:** All 7 server action files

**Description:**
Every action file casts `supabase as any` to bypass type checking. This is a pre-existing pattern (noted in Phase 3/4 reviews) but remains a systemic type safety gap.

**Impact:** Low immediate risk since RLS enforces constraints, but type errors in query shapes (wrong column names, missing relations) would not be caught at compile time.

---

### P3-2: `EvaluationPeriodTable.formatDate` Parses Dates Inconsistently

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\components\evaluations\evaluation-period-table.tsx` (line 29-31)

**Description:**
`new Date(iso).toLocaleDateString('vi-VN')` is used for `start_date` and `end_date`, which are `DATE` type (YYYY-MM-DD). Parsing `new Date('2026-06-15')` treats it as UTC midnight, which in UTC+7 renders as June 15 -- correct in this timezone, but fragile. The project has `parseIsoDateLocal` for timezone-safe parsing.

**Fix:** Use `parseIsoDateLocal` from `lib/utils/date-helpers.ts` for consistency.

---

### P3-3: Unused `Button` Import in `evaluation-history-list.tsx`

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\components\evaluations\evaluation-history-list.tsx` (line 11)

**Description:**
`Button` is imported but never used in the component.

---

### P3-4: Employee Note Form Visible to All Users in Profile Tabs

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\components\employees\employee-profile-tabs.tsx` (lines 33, 91-96)

**Description:**
The notes tab is correctly hidden for `employee` role (line 33, 66), and the `EmployeeNoteForm` is rendered inside the guarded tab (line 93). However, the notes tab is visible to `accountant` role (not in `showNotes` exclusion list). But `getEmployeeNotes` action (line 37-38) explicitly blocks accountant access. So accountant would see the tab but get an error on load.

**Fix:** Update `showNotes` logic:
```typescript
const showNotes = viewerRole === 'admin' || viewerRole === 'branch_manager'
```
This is already correct. The accountant is blocked at the action level. But the `TabsTrigger` would still render because `showNotes` is `false` for accountant, so the tab is hidden. Actually this is correct -- `showNotes` excludes accountant and employee. No fix needed. Removing this finding.

**Revised:** The actual concern is minor -- the `EmployeeNoteForm` component is imported but only rendered conditionally. No functional issue.

---

## Positive Observations

1. **RLS policies are comprehensive and correct.** All 6 evaluation tables have proper RLS: admin full, BM branch-scoped via JOIN, employee read-only own, accountant SELECT-only. The branch scoping uses `EXISTS (SELECT 1 FROM employees e WHERE e.id = ... AND e.branch_id = get_user_branch_id())` -- proper server-side enforcement.

2. **`employee-profile-actions.ts` PROFILE_FIELDS whitelist** is the right design. The whitelist approach to prevent privilege escalation is excellent -- it just needs to be wired up correctly (see P0-1).

3. **`bonus_impact` is properly informational.** Verified: payroll services (`payroll-calculation-service.ts`, `payroll-data-fetcher.ts`) do NOT reference `employee_evaluations` or `bonus_impact`. The UI labels it clearly as informational.

4. **Clean component architecture.** Good separation: score-input is its own component, detail-view fetches lazily on expand, form state is self-contained.

5. **Client-side clamping on score input** (lines 32-34 of `evaluation-score-input.tsx`) provides good UX even though server validation is missing.

6. **BM branch scoping is applied consistently** across all Phase 6 actions (template reads, evaluation queries, evaluation saves, note CRUD, profile updates).

7. **Note types** (`praise | warning | observation | general`) have proper DB CHECK constraint and TypeScript type alignment.

8. **Protected paths in proxy.ts** correctly include `/evaluation-templates` and `/evaluation-periods`.

---

## Metrics

| Metric | Value |
|--------|-------|
| Files Reviewed | 24 |
| Total LOC | ~2,200 |
| TypeScript Errors | 0 |
| Build Status | PASSES |
| `as any` Casts | 14 (pre-existing pattern) |
| Duplicate Code | 3 copies of `checkBmBranchAccess` |
| Files Over 200 Lines | 2 (evaluation-form.tsx: 211, evaluation-template-actions.ts: 207) |

## Finding Summary

| Priority | Count | Key Issues |
|----------|-------|------------|
| P0 | 4 | Privilege escalation, no score validation, wrong total calc, FK crash |
| P1 | 5 | No applies_to check, duplicate helper, no period-open check, inactive template, non-atomic |
| P2 | 7 | Post-fetch auth, no branch-scope on periods, no dedup, race condition, file size, no length limit |
| P3 | 4 | as any, date parsing, unused import, minor |

## Recommended Fix Priority

1. **P0-1** (5 min) -- Swap `updateEmployee` to `updateEmployeeProfile` import
2. **P0-2** (15 min) -- Add server-side score bounds validation
3. **P0-3** (10 min) -- Implement weighted total score calculation
4. **P0-4** (10 min) -- Add existing-evaluations check before criteria replacement
5. **P1-1** (15 min) -- Add applies_to + is_active validation on save
6. **P1-3** (5 min) -- Add period status check on save
7. **P1-2** (15 min) -- Extract shared branch-access helper
8. **P1-4** (5 min) -- Template active check (covered by P1-1)
9. **P1-5** (5 min) -- Rollback orphaned template on criteria failure

---

*Report generated by code-reviewer agent -- Luna HRM Phase 6*
