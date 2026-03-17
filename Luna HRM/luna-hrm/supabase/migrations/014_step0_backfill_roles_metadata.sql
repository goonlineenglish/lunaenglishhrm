-- ============================================================
-- STEP 0: Backfill app_metadata.roles from app_metadata.role
-- Run this in Supabase SQL Editor BEFORE applying migration 014.
-- ============================================================

-- Update all auth users to include roles[] in app_metadata
-- Uses existing role string to populate the new roles array
-- Skips users already having a valid roles array

DO $$
DECLARE
  u RECORD;
  current_role TEXT;
  current_roles JSONB;
BEGIN
  FOR u IN SELECT id, raw_app_meta_data FROM auth.users LOOP
    current_roles := u.raw_app_meta_data -> 'roles';

    -- Skip if roles[] already set and non-empty
    IF current_roles IS NOT NULL
       AND jsonb_typeof(current_roles) = 'array'
       AND jsonb_array_length(current_roles) > 0
    THEN
      CONTINUE;
    END IF;

    -- Get legacy single role
    current_role := u.raw_app_meta_data ->> 'role';
    IF current_role IS NULL THEN
      current_role := 'employee';
    END IF;

    -- Set roles[] array
    UPDATE auth.users
    SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('roles', jsonb_build_array(current_role))
    WHERE id = u.id;

    RAISE NOTICE 'Updated user %: roles = ["%"]', u.id, current_role;
  END LOOP;

  RAISE NOTICE 'Backfill complete!';
END $$;

-- Verify: show all users with their roles
SELECT
  id,
  email,
  raw_app_meta_data ->> 'role' AS legacy_role,
  raw_app_meta_data -> 'roles' AS new_roles_array
FROM auth.users
ORDER BY email;
