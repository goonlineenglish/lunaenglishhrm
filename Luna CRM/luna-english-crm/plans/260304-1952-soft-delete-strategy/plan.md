---
status: completed
---

# Soft Delete Strategy — Luna CRM v0.5.1

## Context
- Brainstorm: `plans/reports/brainstorm-260304-1952-soft-delete-strategy.md`
- Scout findings: leads has existing `deleteLead` hard-delete action (dead code in UI); students have no delete at all; 4 dashboard views need updating; realtime hook needs fix; Sheet sync queries need filter

## Scope
4 tables: `leads`, `students`, `lead_activities`, `lead_stage_notes`

## Phases

| # | Phase | Status | Est |
|---|-------|--------|-----|
| 1 | [DB Migration](phase-01-db-migration.md) | Complete | 1.5h |
| 2 | [Server Actions](phase-02-server-actions.md) | Complete | 2h |
| 3 | [Query Filters](phase-03-query-filters.md) | Complete | 2h |
| 4 | [UI Delete + Trash](phase-04-ui-delete-trash.md) | Complete | 3h |
| 5 | [Testing + Build](phase-05-testing-build.md) | Complete | 1h |

## Dependencies
```
Phase 1 (DB) → Phase 2 (Actions) → Phase 3 (Queries) → Phase 4 (UI) → Phase 5 (Test)
```

## Key Decisions
- Soft delete via `deleted_at TIMESTAMPTZ` (not boolean)
- RLS as defense-in-depth: all SELECT policies filter `deleted_at IS NULL`
- DB trigger cascade: soft-deleting lead auto-soft-deletes activities + stage notes
- Students: soft delete, NOT cascade from lead (students are independent entities)
- Sheet sync: outbound skips deleted; inbound skips if CRM record is deleted
- Purge (hard delete): admin-only, deferred to future phase
- Realtime hook: filter out soft-deleted leads on UPDATE event

## Permission Matrix
| Role | Leads | Students | Activities | Stage Notes |
|------|-------|----------|------------|-------------|
| Admin | Delete + Restore | Delete + Restore | Delete + Restore | Delete + Restore |
| Advisor | Delete/Restore own | No | Delete/Restore own | Delete own |
| Marketing | No | No | No | No |
