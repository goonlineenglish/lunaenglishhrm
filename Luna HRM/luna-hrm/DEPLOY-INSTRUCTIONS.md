# Luna HRM — Production Deployment Guide

**For:** Antigravity DevOps Team
**Project:** Luna HRM (Lightweight HRM for English Language Centers)
**Last Updated:** 2026-03-16
**Status:** Production-ready (xhigh review passed, 130+ tests, 0 build errors)

---

## Overview

| Component | Tech Stack | Notes |
|-----------|-----------|-------|
| **Frontend + Backend** | Next.js 16.1.6 App Router | 24 routes, SSR, PWA |
| **Database** | Supabase Cloud PostgreSQL | Free tier 500MB, 12 migrations (000-011) |
| **Authentication** | Supabase Auth + RLS | JWT with app_metadata (role + branch_id) |
| **Process Manager** | PM2 | Auto-restart on crash |
| **Reverse Proxy** | Caddy or Nginx | HTTPS termination |
| **Server Port** | 3001 | Next.js backend |
| **Cron Jobs** | 4 endpoints | Auto-fill, reminders, payslip confirmation |

---

## Prerequisites

Verify these are installed on Ubuntu server:

```bash
# Node.js 18+ and npm 9+
node --version    # v18.0.0+
npm --version     # 9.0.0+

# PM2 (global)
npm install -g pm2

# Caddy (reverse proxy)
caddy version

# Git
git --version

# curl (for cron jobs)
curl --version
```

If missing, install:

```bash
# Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 globally
sudo npm install -g pm2

# Caddy
sudo apt install -y caddy

# Git
sudo apt install -y git
```

---

## Step 1: Clone Repository

```bash
# SSH (recommended for production)
git clone git@github.com:goonlineenglish/luna-english-crm.git /opt/luna-hrm
cd /opt/luna-hrm/Luna\ HRM/luna-hrm

# Or HTTPS if SSH key not configured
git clone https://github.com/goonlineenglish/luna-english-crm.git /opt/luna-hrm
cd /opt/luna-hrm/Luna\ HRM/luna-hrm
```

---

## Step 2: Environment Configuration

Create `.env.local` in project root:

```bash
# Copy template
cp .env.example .env.local

# Edit with production values
nano .env.local
```

**`.env.local` template:**

```bash
# ===== Supabase (REQUIRED) =====
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[ANON_KEY_FROM_DASHBOARD]
SUPABASE_SERVICE_ROLE_KEY=[SERVICE_ROLE_KEY_FROM_DASHBOARD]

# ===== Cron Security (REQUIRED) =====
# Generate: openssl rand -hex 32
CRON_SECRET=[GENERATE_RANDOM_HEX_32]

# ===== App URL (for password reset emails) =====
NEXT_PUBLIC_APP_URL=https://hrm.buttercup.edu.vn

# ===== Resend API (Optional, for Phase 6 payslip emails) =====
# Get free API key from resend.com (100 emails/day free tier)
RESEND_API_KEY=re_[YOUR_KEY]
```

**Generate CRON_SECRET:**

```bash
openssl rand -hex 32
# Output: a1b2c3d4e5f6... (copy this to CRON_SECRET)
```

**Get Supabase Keys:**

1. Visit [supabase.com/dashboard](https://supabase.com/dashboard)
2. Create new project (or use existing) → **Luna HRM**
3. Go to **Project Settings → API**
4. Copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

> **⚠️ CRITICAL:** Never commit `.env.local` — it's in `.gitignore`

---

## Step 3: Install Dependencies

```bash
npm install
```

Expected output:
```
added 250 packages in 45s
```

---

## Step 4: Build Application

```bash
npm run build
```

**Success indicators:**
- `✓ Compiled successfully` (last line)
- No errors in output
- `.next/` directory created
- 24 routes compiled

**If build fails:**

```bash
# Check for TypeScript errors
npm run lint

# Check Node.js version
node --version    # must be 18+

# Clear cache and retry
rm -rf .next node_modules/.cache
npm run build
```

---

## Step 5: Database Migrations

> **Important:** Run migrations in order via Supabase SQL Editor

1. Go to **Supabase Dashboard → SQL Editor → New Query**
2. For each migration file below, **copy entire content** and **Run**:

| # | File | Runs in Order |
|---|------|:---:|
| 1 | `supabase/migrations/001_create_all_tables.sql` | Yes |
| 2 | `supabase/migrations/002_rls_policies.sql` | Yes |
| 3 | `supabase/migrations/003_indexes.sql` | Yes |
| 4 | `supabase/migrations/004_add_payslip_deductions_column.sql` | Yes |
| 5 | `supabase/migrations/005_audit_logs.sql` | Yes |
| 6 | `supabase/migrations/006_fix_table_permissions.sql` | Yes |
| 7 | `supabase/migrations/007_payslip_audit_logs.sql` | Yes |
| 8 | `supabase/migrations/008_attendance_lock_override.sql` | Yes |
| 9 | `supabase/migrations/009_payroll_class_breakdown.sql` | Yes |
| 10 | `supabase/migrations/010_security_and_index_improvements.sql` | Yes |
| 11 | `supabase/migrations/011_fix_rls_recursion.sql` | Yes |
| 12 | `supabase/migrations/012_employee_payslip_confirmation.sql` | Yes (Phase 6, optional) |

**Verify after each:**
- Output shows "Success. No rows returned." or affected rows count
- No error messages

---

## Step 6: Seed Test Data

> **Important:** Auth users must exist BEFORE running seed script

### 6.1 Create Auth Users (Supabase Dashboard)

Go to **Supabase Dashboard → Authentication → Users → Add User**

Create these test accounts with password `Luna@2026`:

| Email | Role | Branch | Name |
|-------|------|--------|------|
| `admin@luna-hrm.local` | admin | CS Tân Mai | Quản Trị Hệ Thống |
| `bm.tanmai@luna-hrm.local` | branch_manager | CS Tân Mai | Nguyễn Thị Minh |
| `bm.quan1@luna-hrm.local` | branch_manager | CS Quận 1 | Trần Văn Hùng |
| `accountant@luna-hrm.local` | accountant | CS Tân Mai | Phạm Thị Lan |
| `john.smith@luna-hrm.local` | employee (teacher) | CS Tân Mai | John Smith |
| `tran.linh@luna-hrm.local` | employee (assistant) | CS Tân Mai | Trần Thị Linh |
| `le.ngan@luna-hrm.local` | employee (office) | CS Tân Mai | Lê Thị Ngân |

**After creating each user, set app_metadata:**

1. Click user email → **Edit**
2. Scroll to **User Data → app_metadata**
3. Set JSON:

```json
{
  "role": "admin",
  "branch_id": "00000000-0000-0000-0000-000000000001"
}
```

### 6.2 Run Seed Script

```bash
# Option 1: Via Supabase SQL Editor
# Copy supabase/seed.sql content and Run

# Option 2: Via psql (if you have direct DB access)
# psql postgres://postgres:[DB_PASSWORD]@[HOST]:5432/postgres \
#   -f supabase/seed.sql
```

**Verify:**

```bash
# Check in Supabase → SQL Editor
SELECT COUNT(*) FROM employees;
-- Should return: 21

SELECT COUNT(*) FROM class_schedules;
-- Should return: 10
```

---

## Step 7: Start Application with PM2

### 7.1 Start Next.js Server

```bash
# Navigate to project
cd /opt/luna-hrm/Luna\ HRM/luna-hrm

# Start with PM2
pm2 start npm --name luna-hrm -- start -- -p 3001

# Verify running
pm2 list
# Output: luna-hrm | online | 0 | ... | stable

# View logs
pm2 logs luna-hrm
```

### 7.2 Enable PM2 Auto-Startup

```bash
# Generate startup script
pm2 startup

# Save PM2 state (auto-restore on reboot)
pm2 save

# Verify will start after reboot
pm2 show luna-hrm | grep "exec mode"
```

### 7.3 Verify Server Running

```bash
curl http://localhost:3001
# Should return HTML (Next.js app)

curl http://localhost:3001/api/health
# Or check any public route
```

---

## Step 8: Reverse Proxy with Caddy

### 8.1 Configure Caddy

Create `/etc/caddy/Caddyfile`:

```bash
sudo nano /etc/caddy/Caddyfile
```

**Content:**

```caddy
hrm.buttercup.edu.vn {
    reverse_proxy localhost:3001 {
        # Next.js streaming support
        flush_interval -1
    }

    # Security headers
    header {
        -Server
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        X-XSS-Protection "1; mode=block"
    }

    # Compression
    encode gzip

    # Logs
    log {
        output file /var/log/caddy/luna-hrm.log {
            roll_size 10mb
            roll_keep 5
        }
    }
}
```

### 8.2 Test & Reload Caddy

```bash
# Test config
caddy fmt /etc/caddy/Caddyfile

# Reload (auto-renews SSL, no downtime)
sudo systemctl reload caddy

# Verify running
curl https://hrm.buttercup.edu.vn
# Should return Luna HRM app
```

---

## Step 9: Configure Cron Jobs

### 9.1 Generate Cron Secret

Already done in **Step 2** (.env.local CRON_SECRET)

### 9.2 Add Cron Jobs to Crontab

```bash
# Edit crontab
crontab -e

# Add these lines (replace CRON_SECRET with actual value):
# Daily at 9:00 AM — auto-fill attendance
0 9 * * * curl -s -H "x-cron-secret: [YOUR_CRON_SECRET]" https://hrm.buttercup.edu.vn/api/cron/weekly-reminder

# Daily at 9:01 AM — KPI reminder (25th of month)
0 9 25 * * curl -s -H "x-cron-secret: [YOUR_CRON_SECRET]" https://hrm.buttercup.edu.vn/api/cron/kpi-reminder

# Daily at 9:02 AM — Auto-confirm payslips after 3 days (Phase 6)
2 9 * * * curl -s -H "x-cron-secret: [YOUR_CRON_SECRET]" https://hrm.buttercup.edu.vn/api/cron/auto-confirm-payslips

# Daily at 9:03 AM — Payslip reminder on day 2 (Phase 6)
3 9 * * * curl -s -H "x-cron-secret: [YOUR_CRON_SECRET]" https://hrm.buttercup.edu.vn/api/cron/payslip-reminder
```

**Verify cron jobs:**

```bash
# List cron jobs
crontab -l

# Check syslog for execution
tail -f /var/log/syslog | grep CRON
```

---

## Step 10: Post-Deploy Verification

### 10.1 Health Check

```bash
# Check PM2
pm2 status
pm2 logs luna-hrm --lines 20

# Check Caddy
systemctl status caddy
sudo tail -f /var/log/caddy/luna-hrm.log
```

### 10.2 Login Test

1. Visit **https://hrm.buttercup.edu.vn**
2. Login as `admin@luna-hrm.local` / `Luna@2026`
3. Navigate to **Employees** → verify 21 employees listed
4. Navigate to **Class Schedules** → verify 10 classes listed

### 10.3 Database Connectivity

1. In app → **Payroll → Create Period** (test branch query)
2. In app → **Attendance → This Week** (test RLS)
3. Check **Audit Logs** → verify entries appear

### 10.4 Email Sending (Phase 6 only)

```bash
# Check Resend API key
grep RESEND_API_KEY .env.local

# Test via app: Payroll → Send Payslip Emails → check employee inbox
```

---

## Troubleshooting

### Build Fails: "Cannot find module"

```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### RLS Error: "infinite recursion" (42P17)

- Check migration 011 ran successfully
- Verify `get_current_user_is_active()` function exists in Supabase
- Use `createAdminClient()` in code for circular RLS operations

### Cron 401 Unauthorized

```bash
# Verify CRON_SECRET in .env.local
grep CRON_SECRET .env.local

# Verify crontab has correct secret
crontab -l | grep cron-secret

# Check app logs
pm2 logs luna-hrm | grep "401\|cron"
```

### Database Connection Timeout

```bash
# Verify Supabase keys in .env.local
cat .env.local | grep SUPABASE

# Test connectivity
curl -s https://[PROJECT_ID].supabase.co/rest/v1/employees?limit=0 \
  -H "apikey: [ANON_KEY]" \
  -H "Authorization: Bearer [ANON_KEY]"

# Check network (firewall rules allow HTTPS outbound)
```

### High Database Usage (approaching 500MB limit)

```sql
-- In Supabase SQL Editor
SELECT pg_size_pretty(pg_database_size('postgres'));

-- Clean old audit logs (keep 6 months)
DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '6 months';
```

---

## Monitoring

### Real-time Logs

```bash
# Application logs
pm2 logs luna-hrm

# Reverse proxy logs
sudo tail -f /var/log/caddy/luna-hrm.log

# System cron logs
grep CRON /var/log/syslog
```

### PM2 Dashboard

```bash
# Monitor all processes
pm2 monit

# Save logs to file
pm2 logs luna-hrm > /var/log/luna-hrm.txt
```

### Database Monitoring

1. Supabase Dashboard → **Home**
   - Database size
   - API requests
   - Auth sessions

2. Supabase → **SQL Editor** → run:

```sql
-- Table sizes
SELECT schemaname, tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Maintenance

### Update Code

```bash
cd /opt/luna-hrm/Luna\ HRM/luna-hrm
git pull origin main
npm install
npm run build
pm2 restart luna-hrm
```

### Backup Database

```bash
# Via Supabase Dashboard
# Settings → Backups → Manual backup

# Or via pg_dump (if you have access)
pg_dump postgres://[USER]:[PASS]@[HOST]:5432/postgres \
  > luna-hrm-backup-$(date +%Y%m%d).sql
```

### Restart Services

```bash
# Restart Luna HRM
pm2 restart luna-hrm

# Reload Caddy (no downtime, auto SSL renewal)
sudo systemctl reload caddy

# Restart Caddy
sudo systemctl restart caddy
```

---

## Production Alerts Checklist

Set up monitoring for:

- ❌ PM2 crash (auto-restart via PM2)
- ❌ CPU usage > 80%
- ❌ Memory > 1GB
- ❌ Cron job failures (check syslog)
- ❌ Supabase API rate limit (free tier: 50k/month active users)
- ❌ Database size > 450MB (approaching 500MB free tier limit)
- ❌ HTTPS certificate expiry (Caddy auto-renews, check anyway)

---

## Contact & Support

| Issue | Contact | Notes |
|-------|---------|-------|
| App errors | DevOps team | Check `pm2 logs luna-hrm` |
| Database issues | DBA team | Use Supabase dashboard |
| Cron not running | DevOps team | Check syslog + crontab |
| Domain/SSL | DevOps team | Caddy handles auto-renewal |
| Feature bugs | Dev team | Report with log excerpt |

---

**Deployment completed! 🚀**
Verify all checks passed, then notify stakeholders.
