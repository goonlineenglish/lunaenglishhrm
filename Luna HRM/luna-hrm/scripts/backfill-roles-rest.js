// Backfill app_metadata.roles using Supabase Admin REST API
// No external dependencies needed

const https = require('https')

const PROJECT_REF = 'btwwqeemwedtbnskjcem'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function apiRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: PROJECT_REF + '.supabase.co',
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': 'Bearer ' + SERVICE_KEY
      }
    }
    const req = https.request(opts, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }) }
        catch { resolve({ status: res.statusCode, data: data }) }
      })
    })
    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

async function main() {
  const { status, data } = await apiRequest('GET', '/auth/v1/admin/users?per_page=100', null)
  if (status !== 200) {
    console.error('List users failed:', status, JSON.stringify(data))
    process.exit(1)
  }

  const users = data.users || []
  console.log('Found', users.length, 'users')

  let updated = 0
  for (const u of users) {
    const meta = u.app_metadata || {}
    if (Array.isArray(meta.roles) && meta.roles.length > 0) {
      console.log('SKIP', u.email, 'roles=' + JSON.stringify(meta.roles))
      continue
    }
    const legacyRole = meta.role || 'employee'
    const r = await apiRequest('PUT', '/auth/v1/admin/users/' + u.id, {
      app_metadata: Object.assign({}, meta, { roles: [legacyRole] })
    })
    if (r.status === 200) {
      console.log('OK', u.email, '->', legacyRole)
      updated++
    } else {
      console.error('ERR', u.email, r.status, JSON.stringify(r.data))
    }
  }
  console.log('Done:', updated, 'updated')
}

main().catch(function(e) { console.error(e); process.exit(1) })
