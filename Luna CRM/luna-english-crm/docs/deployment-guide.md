# Deployment Guide

## Current State
- **Supabase Cloud**: Database deployed (Singapore)
- **Primary deployment target**: Homeserver (Docker + Caddy) — see below
- **Vercel**: Alternative cloud option (config in `vercel.json`)
- **Local dev**: Working

## Infrastructure

### Supabase Cloud
- **Project URL**: `https://vgxpucmwivhlgvlzzkju.supabase.co`
- **Region**: Southeast Asia (Singapore)
- **Database**: All 23 migrations (001-023) + seed data deployed
- **Auth**: Email/password, admin user created via Dashboard

### Environment Variables
```
# Supabase (public)
NEXT_PUBLIC_SUPABASE_URL=https://vgxpucmwivhlgvlzzkju.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY={anon-key}

# Supabase (server-only, REQUIRED for cron jobs and admin actions)
SUPABASE_SERVICE_ROLE_KEY={service-role-key}

# Cron Auth
CRON_SECRET={random-secret-32-chars}

# Email Communication
RESEND_API_KEY={resend-api-key}
EMAIL_FROM=noreply@luna.edu.vn

# Integrations (optional)
ZALO_OA_TOKEN={token}
ZALO_OA_SECRET={secret}
FACEBOOK_APP_ID={app-id}
FACEBOOK_APP_SECRET={secret}
FACEBOOK_ACCESS_TOKEN={token}
FACEBOOK_VERIFY_TOKEN={token}
```

## Local Development

### Setup
```bash
npm install
# Create .env.local with Supabase credentials from project settings
npm run dev
```

### Clean Restart (Windows)
```bash
taskkill /f /im node.exe
rm -rf .next
npm run dev
```

## Homeserver Deployment (Primary Path)

### Overview
Docker + Caddy on a dedicated homeserver (Dell laptop, i3-4005U, 8GB RAM, Ubuntu).
See full plan: `plans/260224-2014-homeserver-deployment/`

### Quick Reference
```bash
# On homeserver
cd /opt/luna-crm
cp .env.production.template .env.production
# Fill in credentials
sed -i 's/your-domain.com/actual-domain.com/g' Caddyfile
docker compose build && docker compose up -d

# Install cron jobs
chmod +x deploy/cron-setup.sh deploy/cron-health-check.sh
./deploy/cron-setup.sh /opt/luna-crm
```

### Cron Schedule (UTC, host crontab)
| Job | Schedule | Vietnam time |
|-----|----------|--------------|
| `process-message-queue` | `*/5 * * * *` | every 5 min |
| `check-overdue-reminders` | `*/15 * * * *` | every 15 min |
| `refresh-tokens` | `0 */6 * * *` | every 6h |
| `weekly-report` | `0 1 * * 1` | Mon 08:00 |

### Memory Limits (plain Compose, not Swarm)
- `luna-crm`: `mem_limit: 512m`
- `caddy`: `mem_limit: 64m`

> **Note**: `deploy.resources.limits` is Swarm-only and silently ignored by plain `docker compose`. Use `mem_limit` at the service level.

### Files
- `Dockerfile` — multi-stage, Alpine Node 20, standalone output
- `docker-compose.yml` — app + Caddy
- `Caddyfile` — reverse proxy, auto SSL, security headers
- `.env.production.template` — env var template
- `deploy/cron-setup.sh` — installs host crontab
- `deploy/cron-health-check.sh` — health probe

---

## Vercel Deployment (Alternative)

### Steps
1. Connect GitHub repo `goonlineenglish/luna-english-crm` to Vercel
2. Set environment variables (all required vars listed above — minimum: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`)
3. Framework: Next.js (auto-detected)
4. Build command: `npm run build`
5. Output directory: `.next`
6. Deploy!

### Post-Deploy
- Verify all 23 migrations deployed to Supabase Cloud (Phase 10 includes migrations 016-023)
- Set `RESEND_API_KEY` and `EMAIL_FROM` for email communication
- Custom domain configuration (if applicable)
- Vercel Cron verification via `vercel.json`:
  - `/api/cron/check-overdue-reminders` — every 15min (`*/15 * * * *`)
  - `/api/cron/process-message-queue` — every 5min (`*/5 * * * *`)
  - `/api/cron/refresh-tokens` — every 6h (`0 */6 * * *`) — handler window: tokens expiring within 12h
  - `/api/cron/weekly-report` — Mon 01:00 UTC = Mon 08:00 ICT (`0 1 * * 1`)

All cron routes fail-closed: deny without CRON_SECRET header.

## Local Build Test
```bash
npm run build
npm run start
```

## Troubleshooting
- **Windows port 3000 ghost process**: `taskkill /f /im node.exe`
- **Middleware deprecation warning**: Migrate to proxy convention (optional, next iteration)
