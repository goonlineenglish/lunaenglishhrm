-- Migration 008: Add is_override column to attendance_locks
-- Allows admin/BM to override auto-lock on a week, enabling edits
-- even when the week has been auto-locked (>3 days past end).
--
-- New constraint: UNIQUE(branch_id, week_start, is_override)
-- This allows at most 2 rows per (branch, week):
--   is_override=false → manual lock
--   is_override=true  → override (cancels auto-lock effect)

-- Step 1: Add column with default false so existing rows keep their semantics
ALTER TABLE attendance_locks
  ADD COLUMN IF NOT EXISTS is_override BOOLEAN NOT NULL DEFAULT false;

-- Step 2: Drop old UNIQUE constraint
ALTER TABLE attendance_locks
  DROP CONSTRAINT IF EXISTS attendance_locks_branch_id_week_start_key;

-- Step 3: Add new UNIQUE constraint including is_override
ALTER TABLE attendance_locks
  ADD CONSTRAINT attendance_locks_branch_week_override_key
  UNIQUE (branch_id, week_start, is_override);
