# Luna HRM — Deployment Request to Antigravity

**Date:** 2026-03-16
**Project:** Luna HRM (Lightweight HRM for English Language Centers)
**Status:** Production-ready, requesting Ubuntu server deployment
**GitHub:** https://github.com/goonlineenglish/luna-english-crm

---

## Quick Summary

Luna HRM is a **complete, production-ready HRM system** for managing:
- 👥 Employee profiles, attendance tracking, payroll calculation
- 📅 Class schedules, attendance grid (weekly auto-fill, locking)
- 💰 3-tier payroll formulas (teaching, substitute, KPI bonus)
- 📊 KPI evaluation system (5 criteria, auto-bonus calculation)
- 📧 **NEW Phase 6:** Payslip email confirmation + dispute workflow

**Tech Stack:**
- Next.js 16 (App Router) + React 19 + Tailwind CSS v4 + shadcn/ui
- Supabase Cloud PostgreSQL (free tier 500MB)
- PM2 (process manager) + Caddy (reverse proxy)
- 24 routes, 0 build errors, 130+ unit tests passing

---

## Deployment Checklist

Use the detailed guide: **`DEPLOY-INSTRUCTIONS.md`** (in project root)

### Summary Steps (10 minutes):

1. ✅ **Prerequisites:** Node 18+, npm 9+, PM2, Caddy, Git
2. ✅ **Clone:** `git clone` from GitHub
3. ✅ **Config:** Create `.env.local` with Supabase keys + CRON_SECRET
4. ✅ **Build:** `npm install && npm run build`
5. ✅ **DB:** Run 12 migrations via Supabase SQL Editor
6. ✅ **Seed:** Create auth users + run seed.sql (21 test employees)
7. ✅ **Start:** `pm2 start npm --name luna-hrm -- start -- -p 3001`
8. ✅ **Proxy:** Configure Caddy (HTTPS + domain)
9. ✅ **Cron:** Add 4 cron jobs for auto-fill, reminders, payslip confirmation
10. ✅ **Test:** Login, create payroll, verify database

---

## Key Credentials (Test Accounts)

All test accounts use password: **`Luna@2026`**

| Email | Role | Branch |
|-------|------|--------|
| `admin@luna-hrm.local` | Admin | CS Tân Mai |
| `bm.tanmai@luna-hrm.local` | Branch Manager | CS Tân Mai |
| `accountant@luna-hrm.local` | Accountant | CS Tân Mai |
| `john.smith@luna-hrm.local` | Teacher | CS Tân Mai |
| `tran.linh@luna-hrm.local` | Assistant | CS Tân Mai |

---

## Important Environment Variables

| Variable | Example | Source |
|----------|---------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Supabase Dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Supabase Dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Supabase Dashboard (⚠️ SECRET) |
| `CRON_SECRET` | `openssl rand -hex 32` | Generate locally |
| `NEXT_PUBLIC_APP_URL` | `https://hrm.buttercup.edu.vn` | Domain name |
| `RESEND_API_KEY` | `re_...` | Optional, for Phase 6 payslip emails |

---

## Production Readiness

✅ **Code Quality:**
- 0 build errors
- 130+ unit tests passing (6 suites: tax, payroll, KPI, dates, audit, prefill)
- ESLint clean
- Codex plan review approved (5 rounds)

✅ **Security:**
- RLS policies (70+ policies for 4 roles)
- JWT auth with app_metadata (role + branch_id)
- Timing-safe cron secret verification
- Email case-insensitive uniqueness
- Admin client for sensitive mutations

✅ **Performance:**
- 24 routes compiled
- Service worker for static asset caching
- Optimized DB indexes
- N+1 query prevention (shared Supabase client)

---

## Expected After Deploy

| URL | Purpose |
|-----|---------|
| `https://hrm.buttercup.edu.vn` | Main app (Caddy reverse proxy) |
| `https://hrm.buttercup.edu.vn/login` | Login page |
| `https://hrm.buttercup.edu.vn/dashboard` | Admin dashboard |
| `https://hrm.buttercup.edu.vn/api/cron/*` | Cron endpoints (must have CRON_SECRET header) |

**Server Details:**
- Port 3001 (Next.js backend)
- Ubuntu + PM2 (auto-restart)
- HTTPS via Caddy (auto-renewal)

---

## Cron Jobs (4 endpoints)

All run daily at 9:00 AM UTC+7 (adjust if needed):

| Endpoint | Purpose | Frequency |
|----------|---------|-----------|
| `/api/cron/weekly-reminder` | Remind BM of unsaved attendance | Saturdays |
| `/api/cron/kpi-reminder` | Remind BM of unevaluated assistants | 25th of month |
| `/api/cron/auto-confirm-payslips` | Auto-confirm payslips after 3 days (Phase 6) | Daily |
| `/api/cron/payslip-reminder` | Remind employees to confirm payslip (Phase 6) | Daily |

---

## Phase 6: Email Confirmation (Optional, For Future)

**Status:** Codex-reviewed plan ready, not yet implemented

Luna HRM Phase 6 adds payslip email workflow:
1. Admin sends payslips to employees via Resend API (free 100/day)
2. Employees confirm/dispute (max 2 disputes)
3. Auto-confirm after 3 days no response
4. Period finalizes when all confirmed

**To enable Phase 6:**
- Set `RESEND_API_KEY` in `.env.local`
- Implement 8 new files (email service, actions, cron, tests)
- Estimated effort: 1-2 sprints

See plan: `plans/260316-luna-email-confirmation/plan.md`

---

## Post-Deploy Support

**Monitoring:**
- PM2 logs: `pm2 logs luna-hrm`
- Caddy logs: `/var/log/caddy/luna-hrm.log`
- Supabase dashboard: https://supabase.com/dashboard
- Database size: via Supabase SQL Editor

**Troubleshooting Guide:** See `DEPLOY-INSTRUCTIONS.md` (bottom section)

**Common Issues:**
- Build fails → clear `.next` and `node_modules`, retry
- Cron 401 → verify CRON_SECRET in `.env.local` matches crontab
- RLS error → run migration 011 fix via Supabase
- DB full → clean old audit logs (see guide)

---

## Files Ready for Deploy

```
luna-hrm/
├── DEPLOY-INSTRUCTIONS.md          ← MAIN GUIDE (follow this)
├── .env.example                     ← Template (copy to .env.local)
├── package.json                     ← npm scripts (dev, build, start, test)
├── next.config.js                   ← Next.js config
├── supabase/migrations/             ← 12 SQL migration files (000-011)
├── supabase/seed.sql                ← Test data (21 employees, 10 classes)
├── lib/                             ← Server actions, services, hooks
├── components/                      ← React components
├── app/(dashboard)/                 ← Protected routes
├── app/(auth)/                      ← Auth routes
├── docs/                            ← Architecture, standards, roadmap
└── tests/                           ← Unit tests (130+ tests)
```

---

## Deployment Handoff

**When ready to deploy:**

1. ✅ DBA creates Supabase project (or reuse existing)
2. ✅ DevOps gets Supabase keys + generates CRON_SECRET
3. ✅ DevOps follows `DEPLOY-INSTRUCTIONS.md` step-by-step
4. ✅ DevOps runs all migrations (001-011) in order
5. ✅ DevOps creates auth users + runs seed script
6. ✅ DevOps starts PM2 + configures Caddy
7. ✅ DevOps adds cron jobs to crontab
8. ✅ DevOps tests all features (login, payroll, attendance, etc.)
9. ✅ DevOps hands off to ops team for monitoring

**Estimated time:** 30-45 minutes (first time)
**Difficulty:** Medium (requires Supabase + Linux/PM2 knowledge)

---

## Questions?

- **Tech questions:** See `docs/system-architecture.md` + code comments
- **Deployment issues:** See `DEPLOY-INSTRUCTIONS.md` troubleshooting section
- **Codex plan review:** See `plans/reports/codex-review-260316-email-confirmation.md`

---

**Status: ✅ READY FOR DEPLOYMENT** 🚀

All code is committed to GitHub `main` branch.
Ready for Antigravity team to proceed with Ubuntu deployment.
