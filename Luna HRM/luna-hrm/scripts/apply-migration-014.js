/**
 * Apply migration 014 via Supabase Management API
 * Uses the REST execute-sql endpoint (requires service_role key)
 */

const https = require('https')
const fs = require('fs')
const path = require('path')

const PROJECT_REF = 'btwwqeemwedtbnskjcem'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const MIGRATION_FILE = path.join(__dirname, '..', 'supabase', 'migrations', '014_multi_role_schema_and_rls.sql')

function apiRequest(method, hostname, path, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + SERVICE_KEY
      }
    }
    const req = https.request(opts, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }) }
        catch { resolve({ status: res.statusCode, data }) }
      })
    })
    req.on('error', reject)
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body))
    req.end()
  })
}

async function main() {
  const sql = fs.readFileSync(MIGRATION_FILE, 'utf8')
  console.log('Migration SQL loaded:', sql.length, 'chars')
  console.log('Applying via Supabase Management API...')

  // Use Supabase project's Database REST API to execute SQL
  const r = await apiRequest(
    'POST',
    'api.supabase.com',
    `/v1/projects/${PROJECT_REF}/database/query`,
    JSON.stringify({ query: sql })
  )

  if (r.status === 200 || r.status === 201) {
    console.log('Migration 014 applied successfully!')
    console.log(JSON.stringify(r.data, null, 2).substring(0, 500))
  } else {
    console.error('Migration failed:', r.status)
    console.error(JSON.stringify(r.data, null, 2).substring(0, 1000))
    process.exit(1)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
