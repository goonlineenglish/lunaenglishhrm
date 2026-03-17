/**
 * Execute migration 014 via Supabase Management API
 * POST /v1/projects/{ref}/database/query
 * Requires Supabase access token (not service role key)
 *
 * Alternative: Execute directly using the postgres connection
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://btwwqeemwedtbnskjcem.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// Check current DB state
async function checkState() {
  console.log('🔍 Checking current DB state...\n')

  // Check if employees.roles column exists
  const { data: colData, error: colError } = await supabase
    .from('employees')
    .select('id, role, roles')
    .limit(3)

  if (colError) {
    console.log('employees.roles column: ❌ NOT FOUND (need migration)')
    console.log('Error:', colError.message)
    return false
  }

  console.log('employees.roles column: ✅ EXISTS')
  if (colData && colData.length > 0) {
    for (const emp of colData) {
      console.log(`  - role: "${emp.role}" | roles: ${JSON.stringify(emp.roles)}`)
    }
  }

  // Check if get_user_roles function exists
  const { data: fnData, error: fnError } = await supabase.rpc('get_user_roles')
  if (fnError) {
    console.log('\nget_user_roles(): ❌ NOT FOUND (need migration)')
  } else {
    console.log('\nget_user_roles(): ✅ EXISTS')
  }

  // Check if user_has_role function exists
  const { data: hrData, error: hrError } = await supabase.rpc('user_has_role', { role_name: 'admin' })
  if (hrError) {
    console.log('user_has_role(): ❌ NOT FOUND (need migration)')
  } else {
    console.log('user_has_role(): ✅ EXISTS')
  }

  return !colError
}

checkState().then(applied => {
  if (applied) {
    console.log('\n✅ Migration 014 is already applied!')
  } else {
    console.log('\n⚠️  Migration 014 needs to be applied manually.')
    console.log('📋 Go to Supabase Dashboard SQL Editor and run:')
    console.log('   https://supabase.com/dashboard/project/btwwqeemwedtbnskjcem/sql/new')
  }
})
