# Phase 1: Database Migration

## Context Links
- [plan.md](./plan.md)
- Existing migrations: `supabase/migrations/001_create_all_tables.sql` through `006_fix_table_permissions.sql`
- Existing audit log migration: `supabase/migrations/005_audit_logs.sql`

## Overview
- **Priority:** P1 (blocking)
- **Status:** pending
- **Description:** Create `payslip_audit_logs` table to track field-level changes during manual payslip editing.

## Key Insights
- Migration 005 already creates general `audit_logs` table. We need specialized `payslip_audit_logs` for field-level payslip changes.
- Next migration number: `007`
- Must include RLS policies: admin/accountant read, service_role write.

## Schema

```sql
payslip_audit_logs
├── id (uuid PK, default gen_random_uuid())
├── payslip_id (uuid FK → payslips.id ON DELETE CASCADE)
├── field_name (text NOT NULL)
├── old_value (text)
├── new_value (text)
├── changed_by (uuid FK → employees.id)
├── changed_at (timestamptz default now())
```

## Related Code Files
- **Create:** `supabase/migrations/007_payslip_audit_logs.sql`
- **Modify:** `supabase/migrations/000_reset_database.sql` (add DROP TABLE payslip_audit_logs)
- **Reference:** `supabase/migrations/005_audit_logs.sql`, `lib/services/audit-log-service.ts`

## Implementation Steps

1. Create `supabase/migrations/007_payslip_audit_logs.sql`
2. Define table with columns above
3. FK: `payslip_id → payslips(id) ON DELETE CASCADE`, `changed_by → employees(id)`
4. Index on `payslip_id` and `changed_at`
5. Enable RLS, add read policy for admin/accountant, insert for service_role (writes via `createAdminClient()`)
6. **Add `is_reviewed` boolean column to `payslips` table** (default false) — used as completion gate before confirm
7. Update `000_reset_database.sql` to include `DROP TABLE IF EXISTS payslip_audit_logs CASCADE;`
8. Test migration applies cleanly

## Todo List
- [ ] Create `007_payslip_audit_logs.sql` migration file
- [ ] Define table schema with constraints
- [ ] Add foreign keys and cascading deletes
- [ ] Create indexes
- [ ] Add `is_reviewed` boolean column to payslips table (default false)
- [ ] Add RLS policies (read: admin/accountant, write: service_role only)
- [ ] Update `000_reset_database.sql` with DROP TABLE
- [ ] Test migration

## Success Criteria
- Migration runs without errors
- Table accepts inserts with all required fields
- RLS blocks non-admin/non-accountant reads
- Cascading delete works when payslip deleted

## Risk Assessment
- **Audit log growth:** Consider periodic cleanup in future (not critical now)
- **Migration conflicts:** Additive only (new table), low risk

## Next Steps
→ Phase 2 depends on this table for audit log writes
