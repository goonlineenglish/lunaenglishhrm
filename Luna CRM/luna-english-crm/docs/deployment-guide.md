# Deployment Guide

## Current State
- **Supabase Cloud**: Deployed (Singapore)
- **Vercel**: Ready to deploy
- **Local dev**: Working

## Infrastructure

### Supabase Cloud
- **Project URL**: `https://vgxpucmwivhlgvlzzkju.supabase.co`
- **Region**: Southeast Asia (Singapore)
- **Database**: All 15 migrations + seed data deployed
- **Auth**: Email/password, admin user created via Dashboard

### Environment Variables
```
# Supabase (public)
NEXT_PUBLIC_SUPABASE_URL=https://vgxpucmwivhlgvlzzkju.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY={anon-key}

# Cron Auth
CRON_SECRET={random-secret-32-chars}

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

## Vercel Deployment

### Steps
1. Connect GitHub repo `goonlineenglish/luna-english-crm` to Vercel
2. Set environment variables (all 8 above in Vercel dashboard)
3. Framework: Next.js (auto-detected)
4. Build command: `npm run build`
5. Output directory: `.next`
6. Deploy!

### Post-Deploy
- Custom domain configuration (if applicable)
- Vercel Cron verification via `vercel.json`:
  - `/api/cron/check-overdue-reminders` — every 15min
  - `/api/cron/refresh-tokens` — daily (6h)
  - `/api/cron/process-message-queue` — every 5min
  - `/api/cron/weekly-report` — weekly (Mon 8am)

All cron routes fail-closed: deny without CRON_SECRET header.

## Local Build Test
```bash
npm run build
npm run start
```

## Troubleshooting
- **Windows port 3000 ghost process**: `taskkill /f /im node.exe`
- **Middleware deprecation warning**: Migrate to proxy convention (optional, next iteration)
