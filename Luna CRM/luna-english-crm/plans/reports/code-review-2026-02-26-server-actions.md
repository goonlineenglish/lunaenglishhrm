# Code Review Report: Server Actions Consistency

**Date:** 2026-02-26
**Scope:** 10 reviewed files (in-scope) + 5 out-of-scope action files cross-checked
**Reviewer:** code-reviewer

---

## Code Review Summary

### Scope
- **In-scope files:** ensure-user-profile.ts, lead-actions.ts, student-actions.ts, activity-actions.ts, reminder-actions.ts, quick-add-lead-sheet.tsx, student-status-transition.tsx, create-student-dialog.tsx, student-detail-info.tsx, 024_backfill-missing-user-profiles.sql
- **Cross-checked:** stage-notes-actions.ts, checklist-actions.ts, scheduled-activity-actions.ts, notification-actions.ts, auth-actions.ts, dashboard-actions.ts, integration-actions.ts, zalo-message-actions.ts, message-actions.ts, email-actions.ts
- **LOC:** ~1,500 (in-scope), ~800 (cross-check)
- **Focus:** Consistency of ensureUserProfile, error handling, encoding, default roles, revalidatePath

### Overall Assessment

The in-scope files are **well-structured** and consistently follow the established patterns. All five review criteria pass for the primary files. However, cross-checking the full action suite reveals several **out-of-scope files** that do NOT follow the same patterns, creating inconsistency risk.

---

## Criteria Results (In-Scope Files)

### 1. ensureUserProfile Before Writes -- PASS (in-scope) / ISSUES (out-of-scope)

**In-scope files -- all consistent:**
| File | Uses ensureUserProfile | Status |
|------|----------------------|--------|
| lead-actions.ts | All 5 write actions (create, update, updateStage, delete, assign) | PASS |
| student-actions.ts | All 4 write actions (create, update, changeStatus, importCSV) | PASS |
| activity-actions.ts | createActivity (write action) | PASS |
| reminder-actions.ts | createReminder, completeReminder | PASS |
| auth-actions.ts | signIn (post-login) | PASS |

**Out-of-scope files missing ensureUserProfile (write operations):**
| File | Function | Writes? | Missing ensureUserProfile |
|------|----------|---------|--------------------------|
| stage-notes-actions.ts | saveStageNote | YES | YES |
| checklist-actions.ts | updateStageNextStepsConfig | YES | YES |
| scheduled-activity-actions.ts | createScheduledActivity, updateActivityStatus | YES | YES |
| notification-actions.ts | markRead, markAllRead | YES | YES |
| integration-actions.ts | saveZaloTokens, saveFacebookToken, disconnectIntegration | YES | YES |
| zalo-message-actions.ts | sendZaloTemplateMessage | YES | YES |
| message-actions.ts | sendZaloMessage, queueMessage | YES | YES |
| email-actions.ts | sendLeadEmail | YES | YES |
| dashboard-actions.ts | fetchDashboardData | read-only | N/A |

### 2. All Actions Return {error} Instead of Throwing -- PASS

- Zero `throw` statements found across all 15 action files (confirmed via grep).
- All error paths use `return { error: "..." }` pattern.
- Client components (quick-add-lead-sheet, student-status-transition, create-student-dialog, student-detail-info) all check `result.error` before proceeding.

### 3. No Mojibake/Encoding Issues -- PASS

- All Vietnamese strings render correctly in the source files: "Chua dang nhap", "Da xay ra loi", "Khong tim thay", etc.
- UTF-8 encoded properly. No garbled characters detected.
- The SQL migration file (024) also contains clean ASCII-only content.

### 4. Default Role is "advisor" Everywhere -- PASS

- `ensure-user-profile.ts` line 35: `user.user_metadata?.role ?? "advisor"` -- correct
- `024_backfill-missing-user-profiles.sql` line 14: `COALESCE(au.raw_user_meta_data->>'role', 'advisor')` -- correct
- `024_backfill-missing-user-profiles.sql` line 28 (trigger): `COALESCE(NEW.raw_user_meta_data->>'role', 'advisor')` -- correct
- All three locations are consistent.

### 5. Error Handling (try/catch + proper error returns) -- PASS (in-scope) / ISSUES (out-of-scope)

**In-scope files:**
- lead-actions.ts: All 5 functions wrapped in try/catch. PASS.
- student-actions.ts: All 4 write functions wrapped in try/catch. PASS.
  - Note: importStudentsCSV does NOT have try/catch around the outer function, but individual row errors are caught. Acceptable since the per-row insert is in a loop with error accumulation.
- activity-actions.ts: createActivity lacks outer try/catch (no catch for unexpected errors). toggleChecklistItem lacks outer try/catch. **Minor gap but low risk since DB errors are caught.**
- reminder-actions.ts: createReminder, completeReminder, skipReminder all lack outer try/catch. **Minor gap.**

**Out-of-scope files lacking try/catch:**
- stage-notes-actions.ts: No try/catch on saveStageNote.
- checklist-actions.ts: No try/catch on either function.
- scheduled-activity-actions.ts: No try/catch on createScheduledActivity or updateActivityStatus.
- notification-actions.ts: No try/catch on any function.
- integration-actions.ts: testZaloConnection and testFacebookConnection have try/catch for fetch, but saveZaloTokens/saveFacebookToken/disconnectIntegration do not.
- message-actions.ts: No try/catch.
- zalo-message-actions.ts: No try/catch on sendZaloTemplateMessage.
- email-actions.ts: sendLeadEmail has try/catch for Resend call. Others do not.

### 6. revalidatePath Called After Mutations -- PASS (in-scope)

| File | Function | revalidatePath |
|------|----------|---------------|
| lead-actions.ts | createLead | /pipeline |
| lead-actions.ts | updateLead | /pipeline |
| lead-actions.ts | updateLeadStage | /pipeline |
| lead-actions.ts | deleteLead | /pipeline |
| lead-actions.ts | assignLead | /pipeline |
| student-actions.ts | createStudent | /students |
| student-actions.ts | updateStudent | /students |
| student-actions.ts | changeStudentStatus | /students |
| student-actions.ts | importStudentsCSV | /students |
| activity-actions.ts | createActivity | /pipeline |
| activity-actions.ts | toggleChecklistItem | /pipeline |
| reminder-actions.ts | createReminder | /reminders |
| reminder-actions.ts | completeReminder | /reminders |
| reminder-actions.ts | skipReminder | /reminders |

---

## Issues Found (In-Scope Files Only)

### Medium Priority

**M1. reminder-actions.ts -- `skipReminder` missing ensureUserProfile**
- File: `F:\APP ANTIGRAVITY\Tool\Luna CRM\luna-english-crm\lib\actions\reminder-actions.ts`
- Lines 89-109
- `skipReminder()` authenticates the user but does NOT call `ensureUserProfile()` before writing. Both `createReminder` and `completeReminder` do call it, making this an inconsistency.
- Impact: If a user has no public.users row, the skip operation may fail silently due to RLS.
- Fix: Add `ensureUserProfile(supabase, user)` check after auth, same as sibling functions.

**M2. reminder-actions.ts -- `completeReminder` and `createReminder` leak raw Supabase error messages**
- File: `F:\APP ANTIGRAVITY\Tool\Luna CRM\luna-english-crm\lib\actions\reminder-actions.ts`
- Lines 34, 69, 105
- `return { error: error.message }` exposes internal DB error details to the client.
- All other in-scope files use generic Vietnamese messages like "Da xay ra loi. Vui long thu lai."
- Impact: Information disclosure (table names, constraint names, etc. can leak to client).
- Fix: Replace with generic error message. Log `error.message` to console instead.

**M3. activity-actions.ts -- `createActivity` and `toggleChecklistItem` missing outer try/catch**
- File: `F:\APP ANTIGRAVITY\Tool\Luna CRM\luna-english-crm\lib\actions\activity-actions.ts`
- Both functions catch Supabase errors but not unexpected runtime exceptions (e.g., network errors, serialization issues).
- Impact: Uncaught exceptions would surface as 500 errors to the client instead of `{error}`.
- Fix: Wrap each function body in try/catch with fallback `{ error: "Da xay ra loi..." }`.

**M4. reminder-actions.ts -- `createReminder`, `completeReminder`, `skipReminder` missing outer try/catch**
- File: `F:\APP ANTIGRAVITY\Tool\Luna CRM\luna-english-crm\lib\actions\reminder-actions.ts`
- Same issue as M3.

**M5. reminder-actions.ts -- `createReminder` missing UUID validation on `leadId`**
- File: `F:\APP ANTIGRAVITY\Tool\Luna CRM\luna-english-crm\lib\actions\reminder-actions.ts`
- Line 8: `leadId` parameter is used directly without UUID validation.
- `completeReminder` and `skipReminder` also lack UUID validation on `id`.
- All lead-actions.ts and student-actions.ts functions validate UUIDs. This is inconsistent.
- Impact: Low -- Supabase will reject invalid UUIDs, but validation at the app layer is preferred for consistent error messages.

### Low Priority

**L1. quick-add-lead-sheet.tsx -- English toast messages**
- File: `F:\APP ANTIGRAVITY\Tool\Luna CRM\luna-english-crm\components\pipeline\quick-add-lead-sheet.tsx`
- Lines 58, 63: `toast.success("Lead created successfully")` and `toast.error("Something went wrong...")`
- The rest of the UI is Vietnamese. These should be Vietnamese for consistency.

**L2. reminder-actions.ts -- `searchLeads` function placement**
- File: `F:\APP ANTIGRAVITY\Tool\Luna CRM\luna-english-crm\lib\actions\reminder-actions.ts`
- Lines 167-187: `searchLeads()` is a lead query function placed in reminder-actions. Should logically be in lead-actions.ts.
- Impact: Organizational only. No functional issue.

---

## Positive Observations

1. **Consistent `ensureUserProfile` pattern** across all 5 in-scope write action files with proper `"error" in profileResult` checking.
2. **Zero `throw` statements** -- all actions use return-value error propagation. Excellent.
3. **UUID validation** consistently applied in lead-actions.ts and student-actions.ts.
4. **Vietnamese encoding is clean** -- no Mojibake anywhere.
5. **Default role "advisor"** is consistent across JS and SQL -- the three locations agree.
6. **`revalidatePath` coverage is complete** for all mutations in reviewed files.
7. **Client components** properly check `result.error` before showing success toasts.
8. **SQL migration 024** is well-designed: backfills existing gaps + recreates trigger with ON CONFLICT DO NOTHING for idempotency.
9. **Generic error messages** in lead-actions.ts and student-actions.ts prevent information leakage (unlike reminder-actions.ts).

---

## Recommended Actions (Prioritized)

1. **[Medium]** Add `ensureUserProfile` call to `skipReminder()` in reminder-actions.ts.
2. **[Medium]** Replace `error.message` returns in reminder-actions.ts lines 34, 69, 105 with generic Vietnamese error messages; log originals to console.
3. **[Medium]** Add outer try/catch to all functions in activity-actions.ts and reminder-actions.ts.
4. **[Medium]** Add UUID validation to `createReminder(leadId)`, `completeReminder(id)`, `skipReminder(id)` in reminder-actions.ts.
5. **[Low]** Translate English toast messages in quick-add-lead-sheet.tsx to Vietnamese.
6. **[Low]** Consider moving `searchLeads()` from reminder-actions.ts to lead-actions.ts.
7. **[Out-of-scope but important]** Add `ensureUserProfile` to all 8+ write actions in out-of-scope files listed above. This is a systemic consistency gap.

---

## Metrics

- Type Coverage: N/A (no `tsc --noEmit` run performed)
- Test Coverage: 0% (no tests exist)
- Linting Issues: Not checked in this review

## Unresolved Questions

1. Should `importStudentsCSV` have an outer try/catch? Currently it relies on per-row error accumulation, but a network failure mid-loop would throw uncaught.
2. The `completeReminder` auto-creates a follow-up reminder (line 72-83) but does not check if that insert fails. Should it?
3. `notification-actions.ts` functions accept raw `userId` parameter from client without verifying it matches the authenticated user. Is this intentional (admin viewing other users' notifications) or a security gap?
