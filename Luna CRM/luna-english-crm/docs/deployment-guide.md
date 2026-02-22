# Deployment Guide

## Current State
- **Supabase Cloud**: Deployed (Singapore region)
- **Vercel**: Not yet deployed
- **Local dev**: Working

## Infrastructure

### Supabase Cloud
- **Project URL**: `https://vgxpucmwivhlgvlzzkju.supabase.co`
- **Region**: Southeast Asia (Singapore)
- **Database**: All 15 migrations + seed data deployed
- **Auth**: Email/password, admin user created via Dashboard

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://vgxpucmwivhlgvlzzkju.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

## Local Development

### Prerequisites
- Node.js >= 20
- npm >= 10

### Setup
```bash
cd luna-english-crm
npm install
# Create .env.local with Supabase credentials
npm run dev
```

### Clean Restart (Windows)
```bash
taskkill /f /im node.exe
rm -rf .next
npm run dev
```

## Vercel Deployment (Planned)

### Steps
1. Connect GitHub repo `goonlineenglish/luna-english-crm` to Vercel
2. Set environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Framework: Next.js (auto-detected)
4. Build command: `npm run build`
5. Output directory: `.next`

### Post-Deploy
- Configure custom domain (if applicable)
- Set up Vercel Cron for scheduled tasks:
  - `/api/cron/check-overdue-reminders` — every 15 min
  - `/api/cron/refresh-tokens` — daily
  - `/api/cron/process-message-queue` — every 5 min
  - `/api/cron/weekly-report` — weekly

## Known Issues
- Middleware deprecation: Next.js 16 recommends proxy over middleware
- Port 3000 ghost processes on Windows — kill before restart
- Some routes not yet browser-tested: `/reminders`, `/students`, `/reports`, `/settings`
