/**
 * Apply migration via Supabase Data API (pg_net or direct SQL)
 * Uses Supabase's internal /pg endpoint that supports service_role
 */

const https = require('https')
const fs = require('fs')
const path = require('path')

const PROJECT_REF = 'btwwqeemwedtbnskjcem'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const MIGRATION_FILE = path.join(__dirname, '..', 'supabase', 'migrations', '014_multi_role_schema_and_rls.sql')

function apiRequest(hostname, apiPath, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body)
    const opts = {
      hostname,
      path: apiPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        'apikey': SERVICE_KEY,
        'Authorization': 'Bearer ' + SERVICE_KEY,
        'Prefer': 'return=minimal'
      }
    }
    const req = https.request(opts, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null }) }
        catch { resolve({ status: res.statusCode, data }) }
      })
    })
    req.on('error', reject)
    req.write(bodyStr)
    req.end()
  })
}

async function main() {
  const sql = fs.readFileSync(MIGRATION_FILE, 'utf8')
  console.log('Migration SQL:', sql.length, 'chars')

  // Try Supabase's undocumented SQL execution endpoint (service_role)
  // This endpoint is used internally by Supabase Studio
  const r = await apiRequest(
    `${PROJECT_REF}.supabase.co`,
    '/rest/v1/rpc/exec_sql',
    { sql }
  )

  console.log('Status:', r.status)
  if (r.data) console.log(JSON.stringify(r.data).substring(0, 500))
}

main().catch(e => { console.error(e); process.exit(1) })
