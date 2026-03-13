# Code Review: Soft Delete Feature Implementation

**Date:** 2026-03-04
**Reviewer:** code-reviewer
**Scope:** Soft delete for leads, students, activities + trash management UI + migration 035

## Scope

- **Files reviewed:** 17 files (3 server actions, 1 migration, 6 UI components, 3 trash components, 2 nav files, 1 hook, 1 page)
- **LOC:** ~1,150
- **Focus:** Security permissions, SQL correctness, edge cases in dependent queries

## Overall Assessment

Solid implementation with well-structured cascade triggers and RLS updates. The migration is production-quality. However, there are two critical security gaps in `deleteLead` and several medium-priority edge cases where dependent code paths may operate on soft-deleted records.

---

## Critical Issues

### C1. `deleteLead` has NO role check -- marketing can delete leads

**File:** `F:\APP ANTIGRAVITY\Tool\Luna CRM\luna-english-crm\lib\actions\lead-actions.ts` (lines 221-257)

The `deleteLead` function validates UUID and checks authentication, but does NOT check the user's role. Any authenticated user -- including `marketing` role -- can call this server action directly. The UI gates the button (`canDelete = userRole === "admin" || userRole === "advisor"`), but server actions are callable from the browser console or any HTTP client.

**Impact:** Marketing users can delete leads by calling the action directly, bypassing UI-level role gating. This violates the permission model (marketing = no delete access).

**Fix:** Add role check after `ensureUserProfile`:
```typescript
const role = profileResult.profile.role;
if (role === "marketing") {
  return { error: "Ban khong co quyen xoa lead" };
}
```

### C2. `deleteLead` has NO ownership check for advisors

**File:** `F:\APP ANTIGRAVITY\Tool\Luna CRM\luna-english-crm\lib\actions\lead-actions.ts` (lines 221-257)

Per the permission plan, advisors should only delete their OWN leads (`assigned_to = user.id`). The current implementation allows any advisor to delete ANY lead.

Compare with `softDeleteActivity` in `soft-delete-actions.ts` (lines 94-102) which correctly enforces ownership for advisors. `deleteLead` is missing this pattern.

**Impact:** Advisor A can delete leads assigned to Advisor B.

**Fix:** Add ownership check for advisor role:
```typescript
if (role === "advisor") {
  const { data: lead } = await supabase
    .from("leads")
    .select("assigned_to")
    .eq("id", leadId)
    .is("deleted_at", null)
    .single();
  if (!lead || lead.assigned_to !== user.id) {
    return { error: "Ban chi co the xoa lead cua minh" };
  }
}
```

---

## High Priority

### H1. `searchLeads` in reminder-actions.ts returns soft-deleted leads

**File:** `F:\APP ANTIGRAVITY\Tool\Luna CRM\luna-english-crm\lib\actions\reminder-actions.ts` (lines 202-232)

The `searchLeads` function queries `.from("leads")` with `.or(...)` but has no `.is("deleted_at", null)` filter. When creating reminders, users can search and link to soft-deleted leads.

**Impact:** Soft-deleted leads appear in reminder search results. Users can create reminders for deleted leads.

**Fix:** Add `.is("deleted_at", null)` before `.limit(10)`.

### H2. Webhook handlers can create activities on soft-deleted leads

**Files:**
- `F:\APP ANTIGRAVITY\Tool\Luna CRM\luna-english-crm\lib\integrations\facebook-webhook-handler.ts`
- `F:\APP ANTIGRAVITY\Tool\Luna CRM\luna-english-crm\lib\integrations\zalo-webhook-handler.ts`

These handlers use admin client (bypasses RLS) to query leads by phone or create new leads. They don't filter `deleted_at IS NULL` when checking for duplicate leads by phone. A soft-deleted lead could be matched, and activities inserted against it.

**Impact:** Incoming webhooks may match against a soft-deleted lead, inserting new activities that are invisible (since the lead is deleted). These orphaned activities would show up in the trash view without context.

**Mitigation:** The webhook handlers use admin client so RLS doesn't apply. Add `.is("deleted_at", null)` to the phone-based lead lookup queries.

### H3. `message-actions.ts` and `email-actions.ts` operate on soft-deleted leads

**Files:**
- `F:\APP ANTIGRAVITY\Tool\Luna CRM\luna-english-crm\lib\actions\message-actions.ts`
- `F:\APP ANTIGRAVITY\Tool\Luna CRM\luna-english-crm\lib\actions\email-actions.ts`

Both files query `.from("leads").select(...).eq("id", leadId).single()` without `deleted_at IS NULL`. If a race condition occurs (user has lead detail sheet open, another admin deletes it, user clicks "send email"), the action will succeed on the deleted lead.

**Impact:** Emails/messages can be sent for soft-deleted leads if UI is stale.

**Fix:** Add `.is("deleted_at", null)` to the lead lookup in both files.

### H4. `zalo-message-actions.ts` queries leads without soft-delete filter

**File:** `F:\APP ANTIGRAVITY\Tool\Luna CRM\luna-english-crm\lib\actions\zalo-message-actions.ts`

Multiple lead queries (phone lookup, lead detail fetch) do not filter `deleted_at IS NULL`. Same race condition risk as H3.

---

## Medium Priority

### M1. Bulk delete executes sequentially -- performance and partial failure UX

**File:** `F:\APP ANTIGRAVITY\Tool\Luna CRM\luna-english-crm\components\pipeline\lead-bulk-action-bar.tsx` (lines 66-83)

`handleBulkDelete` calls `deleteLead(id)` in a sequential for-loop. For 50 selected leads, this fires 50 separate server action calls. If one fails mid-way, the UI shows partial success but the user has no way to know which ones failed.

**Recommendation:** Consider creating a `bulkDeleteLeads` server action (similar to `bulkUpdateLeadStage`) that accepts an array and returns `BulkResult` with succeeded/failed arrays.

### M2. Trash page is a Server Component with no auth guard

**File:** `F:\APP ANTIGRAVITY\Tool\Luna CRM\luna-english-crm\app\(dashboard)\trash\page.tsx`

The page calls `getDeletedLeads()`, `getDeletedStudents()`, `getDeletedActivities()` which each check admin role internally and return `{ data: null, error: "Chi admin" }`. But the page itself does not redirect non-admin users -- it just shows "0 items" in each tab with no error message.

**Recommendation:** Add a server-side auth + role check at the page level and redirect non-admins, similar to how other admin-only pages work. This provides clearer UX and prevents unnecessary server action calls.

### M3. Soft-deleted activities with `delete` button visible only on `pending` scheduled activities

**File:** `F:\APP ANTIGRAVITY\Tool\Luna CRM\luna-english-crm\components\pipeline\scheduled-activity-list.tsx` (lines 196-228)

The Trash2 delete button only appears for `isScheduled && activity.status === "pending"` activities. Non-scheduled activities (notes, calls, messages) have no delete button. This may be intentional but the inconsistency could confuse users.

**Recommendation:** Clarify in UI whether non-scheduled activities should also be deletable. If yes, add a delete button. If no, document the design decision.

### M4. Admin RLS policy does not filter `deleted_at` -- by design but needs documentation

**File:** `F:\APP ANTIGRAVITY\Tool\Luna CRM\luna-english-crm\supabase\migrations\009_create-rls-policies.sql` (line 56)

The `admin_leads_all` policy has `USING (public.get_user_role() = 'admin')` without `deleted_at IS NULL`. This is correct because admins need to see deleted records in trash. However, it means ALL app-level queries for admins MUST include `.is("deleted_at", null)` to filter correctly. Any new query added without this filter will return deleted records for admin users.

**Recommendation:** Add a code comment in `soft-delete-actions.ts` documenting this design decision: "Admin RLS does not filter deleted_at. All app-level queries MUST add .is('deleted_at', null) for admin users."

### M5. Cascade restore uses timestamp matching -- potential edge case with manual DB edits

**File:** `F:\APP ANTIGRAVITY\Tool\Luna CRM\luna-english-crm\supabase\migrations\035_soft-delete-columns-rls-views.sql` (lines 190-194)

The cascade restore logic uses `deleted_at = OLD.deleted_at` to only restore children that were cascade-deleted at the same time. This is a good pattern. However, if someone manually edits `deleted_at` in the DB (e.g., via Supabase dashboard), the timestamps won't match and cascade restore will miss those records.

**Impact:** Low risk. Manual DB edits are rare. The pattern is sound for normal operation.

### M6. No `lead_stage_notes` listed in soft-delete-actions.ts queries

The migration adds `deleted_at` to `lead_stage_notes` and the cascade trigger handles it. But there's no `getDeletedStageNotes` function or trash table for stage notes. They are cascade-deleted/restored with leads, so they're not independently restorable.

**Impact:** None for now. Stage notes follow their parent lead. But if a future requirement asks to restore individual stage notes, new actions would be needed.

---

## Low Priority

### L1. Deleted leads table shows `current_stage` as raw enum value

**File:** `F:\APP ANTIGRAVITY\Tool\Luna CRM\luna-english-crm\components\trash\deleted-leads-table.tsx` (line 58)

`{lead.current_stage}` displays the raw enum like `moi_tiep_nhan` instead of the Vietnamese label. Other parts of the app use `PIPELINE_STAGES` to map to labels.

### L2. No pagination on trash tables

All three trash tables render full data arrays without pagination. If trash accumulates hundreds of records, the page will be slow.

### L3. `DeletedLead` interface in `deleted-leads-table.tsx` is missing `assigned_to`

The `getDeletedLeads` action selects `assigned_to` but the `DeletedLead` interface (line 10-17) doesn't include it. This is unused data fetched from DB.

---

## Edge Cases Found (Scout Phase)

1. **Race condition:** User has lead detail sheet open, another admin deletes the lead, user clicks delete -> double-delete attempt. The second call succeeds silently (setting `deleted_at` again). No error, but `deleted_at` timestamp changes, which could break cascade restore matching.

2. **Realtime hook handles soft-delete correctly** (`use-realtime-leads.ts` line 45): When a lead is updated with `deleted_at`, the hook removes it from the local state. Good implementation.

3. **Google Sheets sync correctly filters `deleted_at`**: Both inbound and outbound sync files properly filter soft-deleted records.

4. **Dashboard queries updated**: All 4 views (lead_funnel, lead_source_breakdown, advisor_performance, monthly_lead_trend) correctly filter `deleted_at IS NULL`.

5. **Cron jobs**: `check-overdue-reminders` and `weekly-report` correctly filter `deleted_at IS NULL`.

6. **`find_stale_leads()` RPC updated**: Correctly excludes soft-deleted leads and their activities.

---

## Positive Observations

- Clean separation: `soft-delete-actions.ts` for student/activity operations, `lead-actions.ts` for lead operations
- UUID validation on all ID parameters -- consistent pattern
- Cascade trigger in migration 035 is well-designed: uses timestamp matching for surgical restore
- Partial indexes (`idx_leads_active`, etc.) will keep active-record queries fast
- RLS policies properly updated for advisor/marketing roles
- Realtime hook correctly handles soft-delete events
- Dashboard views properly reconstructed with `deleted_at IS NULL`
- Error handling follows project pattern: generic user-facing messages, detailed server logs
- `DeleteConfirmationDialog` is reusable across all delete contexts
- Navigation correctly gates trash page to admin-only

---

## Recommended Actions (Priority Order)

1. **[CRITICAL] Add role check to `deleteLead`** -- Block marketing, enforce advisor ownership
2. **[CRITICAL] Add advisor ownership check to `deleteLead`** -- Advisor can only delete own leads
3. **[HIGH] Add `deleted_at` filter to `searchLeads` in `reminder-actions.ts`**
4. **[HIGH] Add `deleted_at` filter to webhook handlers** (facebook + zalo lead lookups)
5. **[HIGH] Add `deleted_at` filter to `message-actions.ts` and `email-actions.ts`** lead lookups
6. **[MEDIUM] Create `bulkDeleteLeads` server action** to replace sequential loop
7. **[MEDIUM] Add server-side admin guard to trash page** with redirect for non-admins
8. **[LOW] Map `current_stage` to Vietnamese label in deleted-leads-table**

---

## Metrics

| Metric | Value |
|--------|-------|
| Type Coverage | Good -- interfaces defined for all component props |
| Test Coverage | 0% (no tests for soft-delete actions) |
| Linting Issues | None detected in reviewed files |
| Security Issues | 2 critical (missing role/ownership checks in `deleteLead`) |
| Edge Cases Found | 6 (2 critical, 4 informational) |

---

## Unresolved Questions

1. Should non-scheduled activities (notes, calls) also have a delete button, or is the current behavior (only scheduled+pending) intentional?
2. Is there a retention policy for trash? Should soft-deleted records be permanently purged after N days? If so, a cron job is needed.
3. Should the `student_import_actions.ts` check for `deleted_at` when importing students? Currently it inserts new records, but if a student with the same `student_code` was previously soft-deleted, should it be restored instead?
