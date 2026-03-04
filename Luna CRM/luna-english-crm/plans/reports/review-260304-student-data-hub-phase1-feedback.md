# Review Feedback: Student Data Hub Phase 1 (v0.5.0)

Date: 2026-03-04
Reviewer: Codex
Scope:
- plans/260304-1631-student-data-hub-phase1/plan.md
- plans/reports/brainstorm-260304-1542-student-hub-deep-dive.md

## Findings (ordered by severity)

1. [Blocker] Migration count is inconsistent
- `plans/260304-1631-student-data-hub-phase1/plan.md:26` says migrations `029-034` (6 migrations).
- `plans/260304-1631-student-data-hub-phase1/plan.md:48` success criteria also expects 6 migrations.
- `plans/260304-1631-student-data-hub-phase1/phase-01-database-migrations.md:71` lists only `029-033` (5 migrations).
- `plans/260304-1631-student-data-hub-phase1/phase-01-database-migrations.md:121` confirms 5.
- Impact: release/QA checklist cannot be executed consistently.

2. [Blocker] New-table scope mismatch (8 vs 12)
- `plans/reports/brainstorm-260304-1542-student-hub-deep-dive.md:241-253` preview lists 12 new tables.
- `plans/reports/brainstorm-260304-1542-student-hub-deep-dive.md:271` states "12 tables" in Phase 1 scope.
- `plans/260304-1631-student-data-hub-phase1/phase-01-database-migrations.md:22` says 8 new tables.
- Impact: phase dependencies, estimates, and acceptance criteria are ambiguous.

3. [High] `program_type` taxonomy not finalized
- `plans/260304-1631-student-data-hub-phase1/plan.md:42` says 6 program types.
- `plans/260304-1631-student-data-hub-phase1/phase-01-database-migrations.md:30-33` adds 3 values to existing enum (4 -> 7 total).
- Existing code/schema still contains legacy `secondary`:
  - `supabase/migrations/002_create-leads-table.sql:28-33`
  - `lib/types/leads.ts:19-23`
- Impact: reporting/filtering may split data across legacy and new values (`secondary` vs `secondary_basic`/`secondary_advanced`).

4. [High] Inbound Sheet -> CRM flow lacks explicit lead-linking rule
- Mapping requires writing parent fields in `leads`:
  - `plans/260304-1631-student-data-hub-phase1/phase-04-google-sheets-two-way-sync.md:69-72`
- Flow only states "insert student + update lead if exists":
  - `plans/260304-1631-student-data-hub-phase1/phase-04-google-sheets-two-way-sync.md:45`
- But `leads.parent_name` and `leads.parent_phone` are NOT NULL:
  - `supabase/migrations/002_create-leads-table.sql:44-46`
- And `students.lead_id` is nullable:
  - `supabase/migrations/005_create-students-table.sql:23`
- Impact: inbound rows can create students without a valid lead/contact model unless fallback creation rules are defined.

5. [High] `student_code` chosen as cross-system key but enforcement/backfill missing
- Key decision: `student_code` is shared ID across CRM/Sheet/EasyCheck:
  - `plans/260304-1631-student-data-hub-phase1/plan.md:41`
- Current schema only enforces UNIQUE, not NOT NULL:
  - `supabase/migrations/005_create-students-table.sql:24`
- Plan does not define cleanup/backfill for null or invalid codes before enabling 2-way sync.
- Impact: matching failures, duplicate identities, and sync drift.

6. [Medium] No anti-overlap mechanism for 15-min sync runs
- Sync cadence set to every 15 minutes:
  - `plans/260304-1631-student-data-hub-phase1/phase-04-google-sheets-two-way-sync.md:37`
- Snapshot is saved each run:
  - `plans/260304-1631-student-data-hub-phase1/phase-04-google-sheets-two-way-sync.md:58`
- No lock/idempotency/run-token strategy described.
- Impact: concurrent runs can race, corrupt conflict decisions, or overwrite snapshot sequencing.

7. [Medium] Test plan is mostly manual; conflict algorithm lacks automated coverage
- `plans/260304-1631-student-data-hub-phase1/phase-06-testing-and-build.md:25-33` focuses on manual scenarios.
- No explicit automated tests for field-level diff/conflict merge rules.
- Impact: high-risk logic can pass basic manual checks but fail in edge conditions.

8. [Medium] Sync schedule conflicts across docs
- Brainstorm says 15-minute sync:
  - `plans/reports/brainstorm-260304-1542-student-hub-deep-dive.md:20`
- Operation principles mention 06:00 daily sync:
  - `plans/student-hub-operation-principles.md:24`
- Impact: operations can configure wrong schedule; behavior diverges from design.

## Suggested corrections for plan docs

1. Normalize migration numbering/count in all Phase 1 docs (either 029-033 or 029-034).
2. Freeze Phase 1 table scope to one number (8 or 12) and align all dependent phase files.
3. Decide `program_type` final vocabulary and write explicit migration path for legacy `secondary`.
4. Add deterministic inbound rule:
- If sheet row has no linked lead, auto-create lead with explicit defaults for `source` and `current_stage`.
5. Add pre-sync data quality gate for `student_code`:
- block null key rows from sync, log errors, and provide repair list.
6. Add sync concurrency control:
- DB advisory lock or dedicated `sync_runs` table with single-active-run guard.
7. Add automated tests for conflict logic:
- same-field conflict, different-field merge, row reorder, missing snapshot, null values.
8. Publish one canonical schedule (prefer 15-minute if conflict-resolution design depends on near-realtime).

## Unresolved questions

1. Phase 1 creates 8 tables or 12 tables?
2. Keep legacy `secondary` or migrate all to `secondary_basic`/`secondary_advanced`?
3. For new sheet rows without `lead_id`, should system auto-create lead? If yes, what default `source` and `current_stage`?
4. Official sync schedule: `*/15` or `06:00 daily`?

---

# Review Feedback: Student Data Hub Phase 1 (Round 2)

Date: 2026-03-04  
Reviewer: Codex  
Scope:
- `plans/260304-1631-student-data-hub-phase1/plan.md`
- `plans/260304-1631-student-data-hub-phase1/phase-01-database-migrations.md`
- `plans/260304-1631-student-data-hub-phase1/phase-04-google-sheets-two-way-sync.md`
- `plans/260304-1631-student-data-hub-phase1/phase-06-testing-and-build.md`
- `plans/student-hub-operation-principles.md`

## Findings (ordered by severity)

1. [Blocker] Migration set still inconsistent across docs
- `plan.md` uses `029-033` and says 5 migrations.
- `phase-01` says all 4 migrations execute.
- `phase-06` says deploy `029-032`.
- Impact: execution checklist ambiguous; easy to miss a migration.

2. [Blocker] Legacy `secondary` migration SQL is invalid as written
- Uses `UPDATE public.leads SET program_type ...` but leads column is `program_interest`.
- Updates `students.program_type` before that column is added in same snippet.
- Impact: migration script will fail if implemented exactly as documented.

3. [High] `student_code` backfill SQL is risky
- Current snippet uses window function directly in UPDATE and then `SET NOT NULL`.
- No explicit collision-safe strategy against existing unique `student_code`.
- Impact: migration may fail or produce non-deterministic results.

4. [High] Auto-created lead source `google_sheet` lacks guaranteed enum migration
- Plan requires `source='google_sheet'`, but `lead_source` enum currently has no such value.
- Document says "add if needed", but this is mandatory if auto-create rule is mandatory.
- Impact: runtime insert failure in inbound sync.

5. [Medium] "Advisory lock" design is not truly atomic yet
- Plan uses `sync_runs` insert/check flow.
- No atomic lock primitive defined (e.g. `pg_try_advisory_lock`) to prevent race on concurrent starts.
- Impact: overlapping sync can still happen under race.

6. [Medium] New-table scope drift remains (8 vs 9)
- Plan says Phase 1 creates 8 tables.
- Phase 1 migration plan includes `sync_runs`, making it 9 tables.
- Impact: scope/estimate/success criteria mismatch.

7. [Medium] Schedule conflict not fully cleaned
- Sync is declared canonical `*/15`.
- `student-hub-operation-principles.md` still contains `06:00 daily` Google Sheet sync block.
- Impact: operations may configure wrong schedule.

## Recommended patch list (short)

1. Standardize one migration set everywhere: either `029-032` (4 files) or `029-033` (5 files), then align `plan`, `phase-01`, `phase-06`.
2. Fix migration pseudocode:
- `leads.program_interest` (not `program_type`).
- Add students `program_type` column before any update touching it.
3. Redesign `student_code` backfill with deterministic + collision-safe method, then enforce NOT NULL.
4. Add explicit migration step: `ALTER TYPE public.lead_source ADD VALUE IF NOT EXISTS 'google_sheet';`.
5. Choose lock mechanism and state it explicitly:
- Option A: real DB advisory lock (`pg_try_advisory_lock`).
- Option B: keep `sync_runs` but enforce unique active-run constraint + transactional acquire.
6. Update operation-principles doc to remove/annotate `06:00 daily` for Sheet sync.

## Unresolved questions

1. Final migration range: `029-032` or `029-033`?
2. Lock mechanism: true advisory lock or `sync_runs` table lock?
3. Keep Phase 1 table scope at 8, or officially change to 9 (include `sync_runs`)?
