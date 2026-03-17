/**
 * Execute migration 014 SQL via fetch to Supabase pg endpoint
 * Uses the undocumented but functional REST SQL execution approach
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

const SUPABASE_URL = 'https://btwwqeemwedtbnskjcem.supabase.co'
const PROJECT_REF = 'btwwqeemwedtbnskjcem'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set')
  process.exit(1)
}

const sqlFile = resolve(process.cwd(), 'supabase/migrations/014_multi_role_schema_and_rls.sql')
const sql = readFileSync(sqlFile, 'utf-8')

async function executeSql(query) {
  // Try Supabase management API
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query }),
    }
  )

  const text = await response.text()
  return { status: response.status, body: text }
}

async function main() {
  console.log('🚀 Executing migration 014 via Supabase Management API...\n')

  const result = await executeSql(sql)
  console.log('Status:', result.status)
  console.log('Response:', result.body.substring(0, 1000))

  if (result.status === 200 || result.status === 201) {
    console.log('\n✅ Migration 014 executed successfully!')
  } else if (result.status === 401) {
    console.log('\n⚠️  Management API requires Supabase Access Token (not service role key)')
    console.log('   Service role key is for the project API, not the management API.')
    console.log('\n📋 Manual steps required:')
    console.log('   1. Go to: https://supabase.com/dashboard/project/' + PROJECT_REF + '/sql/new')
    console.log('   2. Run: supabase/migrations/014_multi_role_schema_and_rls.sql')
  } else {
    console.log('\n❌ Failed. Status:', result.status)
  }
}

main().catch(console.error)
