# Phase 3: Query Filters — Add `deleted_at IS NULL` to All Queries

## Overview
- **Priority**: High
- **Status**: Pending
- **Depends on**: Phase 1 (migration), Phase 2 (actions)

## Key Insights
- RLS provides defense-in-depth for non-admin roles, but admin queries bypass RLS via `getAdminClient()`
- All admin-client queries (cron jobs, Sheet sync, dashboard) MUST add explicit `.is("deleted_at", null)`
- Client-side queries (pipeline page) also need filter since admin sees all via RLS

## Files to Modify (17 files)

### Pipeline + Lead Queries
| File | Line(s) | Change |
|------|---------|--------|
| `app/(dashboard)/pipeline/page.tsx` | ~34 | Add `.is("deleted_at", null)` to leads SELECT |
| `lib/actions/lead-actions.ts` | ~124, ~167, ~192, ~288, ~307, ~353 | Add filter to update/select queries |
| `lib/actions/activity-actions.ts` | ~74, ~101, ~145 | Filter on lead_activities + lead lookups |

### Student Queries
| File | Line(s) | Change |
|------|---------|--------|
| `lib/actions/student-crud-actions.ts` | ~40+ | Add `.is("deleted_at", null)` to student SELECT/UPDATE queries |
| `lib/actions/scheduled-activity-actions.ts` | ~179+ | Filter scheduled activities that reference leads/students |

### Dashboard Queries
| File | Line(s) | Change |
|------|---------|--------|
| `lib/queries/dashboard-queries.ts` | ~59, ~71, ~77, ~102, ~141, ~190 | Filter leads + students counts |

### Google Sheet Sync (admin client — no RLS protection)
| File | Line(s) | Change |
|------|---------|--------|
| `lib/integrations/google-sheets-outbound-sync.ts` | ~20, ~59, ~111-113, ~140 | Filter all outbound queries |
| `lib/integrations/google-sheets-inbound-sync.ts` | ~70-76, ~82-88, ~139 | CRITICAL: filter `resolveLeadId` lookups + student lookup to prevent matching deleted records |

### Cron Jobs
| File | Line(s) | Change |
|------|---------|--------|
| `app/api/cron/weekly-report/route.ts` | ~36, ~41 | Filter lead/student counts |
| `app/api/cron/check-overdue-reminders/route.ts` | ~146 | Skip if parent lead is soft-deleted |

### RPC Functions (in migration SQL)
| File | Line(s) | Change |
|------|---------|--------|
| `supabase/migrations/021_extend-stage-trigger-with-checklist.sql` | ~112 | `find_stale_leads()` RPC must add `AND deleted_at IS NULL` to its query |

### Realtime Hook
| File | Line(s) | Change |
|------|---------|--------|
| `lib/hooks/use-realtime-leads.ts` | ~52-57 | Handle UPDATE event: if `deleted_at` is set, remove from local state instead of merging |

## Implementation Steps

### 1. Pattern: `.is("deleted_at", null)`
Supabase PostgREST filter for `WHERE deleted_at IS NULL`:
```typescript
.is("deleted_at", null)
```
Add this to every `.from("leads").select(...)`, `.from("students").select(...)`, `.from("lead_activities").select(...)` query.

### 2. Inbound sync — CRITICAL fix
In `resolveLeadId()`, phone + name lookups must NOT match deleted leads:
```typescript
// Before
.from("leads").select("id").eq("parent_phone", phone.trim())
// After
.from("leads").select("id").eq("parent_phone", phone.trim()).is("deleted_at", null)
```
Same for student lookup in `processInboundSync`:
```typescript
.from("students").select("id, lead_id").eq("student_code", studentCode).is("deleted_at", null)
```

### 3. Realtime hook fix
```typescript
// In UPDATE handler, check if lead was soft-deleted
.on("postgres_changes", { event: "UPDATE", ... }, (payload) => {
  const updated = payload.new as Lead & { deleted_at?: string | null };
  if (updated.deleted_at) {
    // Soft-deleted — remove from local state
    setLeads((prev) => prev.filter((l) => l.id !== updated.id));
  } else {
    // Normal update — merge
    setLeads((prev) => prev.map((l) => l.id === updated.id ? { ...l, ...updated } : l));
  }
})
```

### 4. Remove existing hard DELETE handler from realtime hook
With soft delete, Supabase won't fire DELETE events for leads anymore. Keep the handler as safety net but it's effectively dead code.

## Todo
- [ ] Add `.is("deleted_at", null)` to pipeline page query
- [ ] Add filter to all lead-actions.ts queries (6 locations)
- [ ] Add filter to activity-actions.ts queries (3 locations)
- [ ] Add filter to student-crud-actions.ts queries
- [ ] Add filter to scheduled-activity-actions.ts queries
- [ ] Add filter to dashboard-queries.ts (6 locations)
- [ ] Add filter to outbound sync queries (4 locations)
- [ ] Add filter to inbound sync lookups (3 locations) — CRITICAL
- [ ] Add filter to weekly-report cron (2 locations)
- [ ] Add filter to overdue-reminders cron (1 location)
- [ ] Update `find_stale_leads()` RPC in migration 035 to add `deleted_at IS NULL`
- [ ] Fix realtime hook UPDATE handler

## Success Criteria
- No query (except admin trash view) returns soft-deleted records
- Sheet sync doesn't export or match deleted records
- Realtime UI removes soft-deleted leads immediately
- Dashboard counts exclude deleted data

## Risk
- Missing a query = data leak (deleted records visible). RLS mitigates for non-admin.
- Admin client queries (cron, sync) have NO RLS protection — must not miss any.
