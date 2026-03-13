# Phase 1: DB Migration — Soft Delete Columns + RLS + Views

## Overview
- **Priority**: Critical (blocks all other phases)
- **Status**: Pending
- **Migration file**: `supabase/migrations/035_soft-delete-columns-rls-views.sql`

## Key Insights
- 4 tables need `deleted_at TIMESTAMPTZ DEFAULT NULL`
- 4 dashboard views must be recreated with `WHERE deleted_at IS NULL`
- All SELECT RLS policies must add `AND (deleted_at IS NULL)` condition
- DB trigger for cascade: soft-deleting lead → auto-soft-delete its activities + stage notes
- Students do NOT cascade from leads (independent entity)

## Related Code Files
- `supabase/migrations/009_create-rls-policies.sql` — existing RLS for leads, students, lead_activities
- `supabase/migrations/020_add-rls-for-new-tables.sql` — existing RLS for lead_stage_notes
- `supabase/migrations/012_create-dashboard-views.sql` — 4 dashboard views

## Implementation Steps

### 1. Add `deleted_at` column to 4 tables
```sql
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.lead_activities ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.lead_stage_notes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
```

### 2. Create partial index for fast filtered queries
```sql
CREATE INDEX IF NOT EXISTS idx_leads_active ON public.leads (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_students_active ON public.students (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lead_activities_active ON public.lead_activities (id) WHERE deleted_at IS NULL;
```

### 3. Update RLS policies — DROP + RECREATE with `deleted_at IS NULL`

**leads** (from migration 009):
- `admin_leads_all` → no change (admin sees all including deleted for trash view)
- `advisor_leads_select` → add `AND deleted_at IS NULL`
- `marketing_leads_select` → add `AND deleted_at IS NULL`
- **NEW**: `admin_leads_select_deleted` → admin can SELECT where `deleted_at IS NOT NULL` (trash view)

**students** (from migration 009):
- `admin_students_all` → no change
- `advisor_students_select` → add `AND deleted_at IS NULL`
- `marketing_students_select` → add `AND deleted_at IS NULL`

**lead_activities** (from migration 009):
- `admin_activities_all` → no change
- `advisor_activities_select` → add `AND deleted_at IS NULL`
- `marketing_activities_select` → add `AND deleted_at IS NULL`

**lead_stage_notes** (from migration 020):
- `admin_stage_notes_all` → no change
- `advisor_stage_notes_select` → add `AND deleted_at IS NULL`
- `marketing_stage_notes_select` → add `AND deleted_at IS NULL`

**Important**: Use idempotent `DO $$ BEGIN ... EXCEPTION WHEN` pattern for policy drops.

### 4. Recreate 4 dashboard views with filter
```sql
CREATE OR REPLACE VIEW public.lead_funnel AS
  SELECT current_stage, COUNT(*) as lead_count
  FROM public.leads WHERE deleted_at IS NULL GROUP BY current_stage;

CREATE OR REPLACE VIEW public.lead_source_breakdown AS
  SELECT source, COUNT(*) as lead_count
  FROM public.leads WHERE deleted_at IS NULL GROUP BY source;

-- advisor_performance and monthly_lead_trend similarly
```

### 5. Cascade trigger: soft-deleting lead → cascade to activities + stage notes
```sql
CREATE OR REPLACE FUNCTION public.cascade_soft_delete_lead()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    UPDATE public.lead_activities SET deleted_at = NEW.deleted_at WHERE lead_id = NEW.id AND deleted_at IS NULL;
    UPDATE public.lead_stage_notes SET deleted_at = NEW.deleted_at WHERE lead_id = NEW.id AND deleted_at IS NULL;
  END IF;
  -- Cascade restore: if lead is restored, restore its children
  IF NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN
    UPDATE public.lead_activities SET deleted_at = NULL WHERE lead_id = NEW.id AND deleted_at = OLD.deleted_at;
    UPDATE public.lead_stage_notes SET deleted_at = NULL WHERE lead_id = NEW.id AND deleted_at = OLD.deleted_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_cascade_soft_delete_lead
  AFTER UPDATE OF deleted_at ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.cascade_soft_delete_lead();
```

Note: Restore cascade uses `deleted_at = OLD.deleted_at` to only restore items that were cascade-deleted at the same time (not individually deleted items).

## Todo
- [ ] Write migration 035 SQL file
- [ ] Test migration locally or on staging
- [ ] Verify RLS policies work: advisor can't see deleted, admin can
- [ ] Verify dashboard views exclude deleted leads

## Success Criteria
- `deleted_at` column exists on all 4 tables, default NULL
- Partial indexes created for active-record queries
- All non-admin SELECT policies filter `deleted_at IS NULL`
- Dashboard views exclude soft-deleted data
- Cascade trigger works: delete lead → activities + notes cascade; restore → cascade restore

## Risk
- Large policy rewrite — must be idempotent. Use `DROP POLICY IF EXISTS` + `CREATE POLICY`.
- Dashboard views use `CREATE OR REPLACE` — safe.
- Trigger must be `SECURITY DEFINER` to bypass RLS when cascading.
