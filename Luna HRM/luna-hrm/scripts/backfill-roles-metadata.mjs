/**
 * Step 0: Backfill app_metadata.roles from app_metadata.role
 * Run BEFORE applying migration 014.
 *
 * Logic:
 * - For each auth user, read app_metadata.role (existing single string)
 * - Set app_metadata.roles = [role] (new array format)
 * - Preserve existing roles array if already set
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://btwwqeemwedtbnskjcem.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function main() {
  console.log('🔄 Backfilling app_metadata.roles from app_metadata.role...\n')

  // List all users via admin API
  const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (error) {
    console.error('❌ Failed to list users:', error.message)
    process.exit(1)
  }

  console.log(`Found ${users.length} users\n`)

  let updated = 0
  let skipped = 0
  let errors = 0

  for (const user of users) {
    const meta = user.app_metadata ?? {}
    const existingRole = meta.role ?? null
    const existingRoles = meta.roles ?? null

    // Skip if roles array already populated
    if (existingRoles && Array.isArray(existingRoles) && existingRoles.length > 0) {
      console.log(`  ⏭️  ${user.email} — roles already set: [${existingRoles.join(', ')}]`)
      skipped++
      continue
    }

    // Build roles array from existing role
    const newRoles = existingRole ? [existingRole] : ['employee']

    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      app_metadata: {
        ...meta,
        roles: newRoles,
        // Keep legacy role for backward compat during transition
      }
    })

    if (updateError) {
      console.error(`  ❌ ${user.email} — ${updateError.message}`)
      errors++
    } else {
      console.log(`  ✅ ${user.email} — set roles: [${newRoles.join(', ')}]`)
      updated++
    }
  }

  console.log(`\n📊 Summary:`)
  console.log(`   Updated: ${updated}`)
  console.log(`   Skipped (already had roles): ${skipped}`)
  console.log(`   Errors:  ${errors}`)

  if (errors > 0) {
    console.log('\n⚠️  Some users failed to update. Check errors above.')
    process.exit(1)
  } else {
    console.log('\n✅ Backfill complete! Now apply migration 014.')
  }
}

main()
