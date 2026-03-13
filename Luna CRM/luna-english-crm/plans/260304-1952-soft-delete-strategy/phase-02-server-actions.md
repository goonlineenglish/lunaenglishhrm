# Phase 2: Server Actions — Soft Delete + Restore

## Overview
- **Priority**: High
- **Status**: Pending
- **Depends on**: Phase 1 (migration deployed)

## Key Insights
- Existing `deleteLead` in `lead-actions.ts:220` does hard delete — replace with soft delete
- No `deleteStudent` exists — create new
- Activities: `deleteActivity` doesn't exist — create new
- Permission checks: advisor can only delete own leads/activities; admin can delete any

## Related Code Files
- `lib/actions/lead-actions.ts` — replace `deleteLead` (line 220-251)
- `lib/actions/student-crud-actions.ts` — add `softDeleteStudent`, `restoreStudent`
- `lib/actions/activity-actions.ts` — add `softDeleteActivity`, `restoreActivity`
- NEW: `lib/actions/soft-delete-actions.ts` — shared `softDelete`/`restore` helpers + admin trash listing

## Implementation Steps

### 1. Create `lib/actions/soft-delete-actions.ts` (~100 lines)

Shared helpers:
```typescript
// Generic soft delete/restore for any table
async function softDeleteRow(table: string, id: string, userId: string, role: string): Promise<{ error?: string }>
async function restoreRow(table: string, id: string, role: string): Promise<{ error?: string }>

// Admin trash views
export async function getDeletedLeads(): Promise<{ data: Lead[] | null; error?: string }>
export async function getDeletedStudents(): Promise<{ data: Student[] | null; error?: string }>
```

Permission logic inside `softDeleteRow`:
- Admin: can delete any row
- Advisor on leads: check `assigned_to = userId` (leads table has no `created_by` column)
- Advisor on activities: check `created_by = userId`
- Marketing: reject

Restore logic:
- Admin: can restore any
- Advisor: can restore own (same permission as delete)
- Marketing: reject

### 2. Update `lead-actions.ts` — replace hard delete

Replace `deleteLead()` (line 220-251):
```typescript
export async function deleteLead(leadId: string) {
  // ... existing auth + validation ...
  // CHANGE: soft delete instead of hard delete
  const { error } = await supabase
    .from("leads")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", leadId);
  // Cascade handled by DB trigger (phase 1)
}
```

Add `restoreLead()`:
```typescript
export async function restoreLead(leadId: string) {
  // Auth check: admin or own lead
  const { error } = await supabase
    .from("leads")
    .update({ deleted_at: null })
    .eq("id", leadId);
  // Cascade restore handled by DB trigger
}
```

### 3. Add to `student-crud-actions.ts`

```typescript
export async function softDeleteStudent(studentId: string)
export async function restoreStudent(studentId: string)
```
Admin-only for students (per permission matrix).

### 4. Add to `activity-actions.ts`

```typescript
export async function softDeleteActivity(activityId: string)
export async function restoreActivity(activityId: string)
```
Advisor can delete own; admin can delete any.

## Todo
- [ ] Create `soft-delete-actions.ts` with shared helpers + trash listing
- [ ] Update `deleteLead` in `lead-actions.ts` to soft delete
- [ ] Add `restoreLead` to `lead-actions.ts`
- [ ] Add `softDeleteStudent`, `restoreStudent` to `student-crud-actions.ts`
- [ ] Add `softDeleteActivity`, `restoreActivity` to `activity-actions.ts`
- [ ] Verify `student-actions.ts` barrel re-exports new functions

## Success Criteria
- `deleteLead` does UPDATE not DELETE
- Restore works for leads (cascade restores activities + notes via trigger)
- Permission checks: advisor can only soft-delete own, admin any
- All actions return proper error messages on permission denial
