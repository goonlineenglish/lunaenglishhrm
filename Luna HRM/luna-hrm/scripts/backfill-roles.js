/**
 * Step 0: Backfill app_metadata.roles for existing users before migration 014
 * Must run BEFORE applying migration SQL
 */
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://btwwqeemwedtbnskjcem.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!serviceRoleKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY not set')
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function main() {
  console.log('Listing auth users...')
  const { data: { users }, error } = await admin.auth.admin.listUsers({ perPage: 100 })
  if (error) { console.error(error); process.exit(1) }

  console.log(`Found ${users.length} users`)
  let updated = 0

  for (const u of users) {
    const meta = u.app_metadata ?? {}
    // Skip if roles[] already set and non-empty
    if (Array.isArray(meta.roles) && meta.roles.length > 0) {
      console.log(`  SKIP ${u.email}: roles already set = ${JSON.stringify(meta.roles)}`)
      continue
    }
    
    // Backfill roles from legacy role string
    const legacyRole = meta.role ?? 'employee'
    const newMeta = { ...meta, roles: [legacyRole] }
    
    const { error: updErr } = await admin.auth.admin.updateUserById(u.id, {
      app_metadata: newMeta
    })
    if (updErr) {
      console.error(`  ERROR ${u.email}: ${updErr.message}`)
    } else {
      console.log(`  OK ${u.email}: roles = ['${legacyRole}']`)
      updated++
    }
  }
  
  console.log(`\nBackfill complete: ${updated}/${users.length} updated`)
}

main().catch(console.error)
