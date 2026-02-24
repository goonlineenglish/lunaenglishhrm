# System Architecture

## Stack
| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.1.6 |
| Language | TypeScript (strict) | ^5 |
| Styling | Tailwind CSS v4 | ^4 |
| UI Components | shadcn/ui + Radix UI | latest |
| Database | Supabase (PostgreSQL) | Cloud (Singapore) |
| Auth | Supabase Auth | via @supabase/ssr |
| Drag-drop | @dnd-kit | ^6.3.1 |
| Charts | Recharts | ^3.7.0 |
| Toasts | Sonner | ^2.0.7 |
| Table | @tanstack/react-table | ^8.21.3 |
| Date | date-fns + date-fns-tz | ^4.1.0 |
| Email | Resend | ^4 |

## Application Architecture

```
┌──────────────────────────────────────────────┐
│                   Browser                     │
│  Pipeline  │  Students  │  Dashboard  │ Activities │
│  (Kanban)  │  (Table)   │  (Charts)   │ (Schedule) │
└────────────────────────────────────────────┬─┘
                     Server Actions
┌────────────────────────────────────────────┼──┐
│  Next.js Server                            │  │
│  ┌─────────────────────────────────────┐   │  │
│  │  Server Actions (lib/actions/)      │   │  │
│  │  Mutations + DB queries             │   │  │
│  ├─────────────────────────────────────┤   │  │
│  │  API Routes (app/api/)              │   │  │
│  │  Webhooks: Zalo, Facebook           │   │  │
│  │  Cron: 15min-weekly                 │   │  │
│  └─────────────────────────────────────┘   │  │
│  Middleware: Auth session refresh          │  │
└────────────────────────────────────────────┼──┘
                     SQL + RLS
┌────────────────────────────────────────────┼──┐
│  Supabase Cloud (Singapore)                │  │
│  ┌─────────────────────────────────────┐   │  │
│  │  PostgreSQL: 8 core + 4 comm + 7 sup│   │  │
│  │  Auth: email/password               │   │  │
│  │  Realtime subscriptions             │   │  │
│  │  Triggers: stage→reminder, →student │   │  │
│  │  Triggers: stage→checklist creation │   │  │
│  │  RPC: find_stale_leads()            │   │  │
│  │  Views: funnel, source, perf, trend │   │  │
│  └─────────────────────────────────────┘   │  │
└────────────────────────────────────────────┘──┘
```

## Directory Structure

```
app/
├── (auth)/login/           # Public login page
├── (dashboard)/            # Protected: sidebar + auth guard
│   ├── pipeline/           # 8-stage Kanban board
│   ├── reminders/          # Follow-up management
│   ├── students/           # Enrollment + CSV import
│   ├── reports/            # Dashboard analytics
│   ├── activities/         # Scheduled activities view
│   └── settings/           # Integration config
├── api/
│   ├── webhooks/           # Inbound: Zalo, Facebook
│   └── cron/               # Scheduled: 4 endpoints
├── layout.tsx              # Root layout + fonts
├── globals.css             # Tailwind v4 theme
└── middleware.ts           # Auth session

components/
├── ui/                     # 13 shadcn/ui base components
├── pipeline/               # 21 Kanban + lead + activity + communication components
├── students/               # 10 enrollment components
├── dashboard/              # 7 KPI + chart components
├── reminders/              # 4 reminder components
├── settings/               # 6 integration + stage config components
├── layout/                 # 8 sidebar/header components
└── auth/                   # 1 login form

lib/
├── actions/                # 14 server action files
├── hooks/                  # 3 realtime + optimistic
├── integrations/           # Zalo, Facebook, queue
├── queries/                # Dashboard SQL queries
├── supabase/               # Client/server/admin/middleware
├── constants/              # Navigation, stages, roles
├── types/                  # TypeScript interfaces
└── utils/                  # Format, CSV, referral codes, template renderer

supabase/
├── migrations/             # 21 SQL files (001-021)
└── seed.sql                # 10 sample leads
```

## Database Schema (21 migrations)

### Core Tables (8)
| Table | Rows | RLS | Trigger |
|-------|------|-----|---------|
| users | 10 | admin=all, self | -- |
| leads | 100+ | admin=all, advisor=assigned | none |
| lead_activities | 200+ | follows lead | none |
| follow_up_reminders | 100+ | advisor=own | create on stage change |
| students | 20+ | admin=all, advisor=assigned | auto-enroll at da_dang_ky |
| notifications | 50+ | user=own | -- |
| integration_tokens | 2 | admin=all | -- |
| webhook_events | 100+ | admin=read | -- |

### Activity & Communication Tables (4)
| Table | Purpose | RLS |
|-------|---------|-----|
| lead_stage_notes | Per-stage notes/results/next-steps per lead | advisor=own, admin=all |
| stage_next_step_configs | Configurable checklists per pipeline stage (7 stages seeded) | admin=write, all=read |
| email_templates | Email templates with {{var}} placeholders | admin=write, all=read |
| zalo_message_templates | Zalo OA message templates with placeholders | admin=write, all=read |

### Support Tables (7)
- message_queue -- outbound messages (retry logic, exponential backoff)
- zalo_followers -- Zalo OA follower mapping
- reports -- periodic report storage

### Enums & Views
**Enums**: lead_stage (8), lead_source (5), program_type (3), activity_type (10: +scheduled_call, trial_class, consultation, checklist), reminder_type (4), reminder_status (3), student_status (3), renewal_status (3)

**Dashboard Views**:
- lead_funnel — leads per stage
- lead_source_breakdown — leads grouped by source
- advisor_performance — conversions + metrics per advisor
- monthly_lead_trend — monthly new lead counts

## API Routes

### Webhooks (POST)
| Route | Source | Signature |
|-------|--------|-----------|
| /api/webhooks/zalo | Zalo OA | HMAC-SHA256 |
| /api/webhooks/facebook | Facebook | HMAC-SHA256 |

### Cron Endpoints (GET)
| Route | Schedule | Auth |
|-------|----------|------|
| /api/cron/check-overdue-reminders | every 15min | CRON_SECRET |
| /api/cron/refresh-tokens | daily (6h) | CRON_SECRET |
| /api/cron/process-message-queue | every 5min | CRON_SECRET |
| /api/cron/weekly-report | Mon 8am | CRON_SECRET |

All cron routes fail-closed: deny without CRON_SECRET env var.

The `check-overdue-reminders` cron handles 4 sections:
1. Overdue follow-up reminders
2. Activity deadline notifications
3. Stale lead detection (via `find_stale_leads()` RPC)
4. Trial class Zalo auto-reminder (24h before)

## Environment Variables (New for Activities & Communication)
| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Resend email API key |
| `EMAIL_FROM` | Sender email address (e.g., `noreply@luna.edu.vn`) |

## Auth Flow
1. User submits email/password on `/login`
2. Supabase Auth validates, returns session token
3. Middleware refreshes session on every request
4. Server components use `supabase.auth.getUser()` (never `getSession()`)
5. RLS policies enforce data access based on role + user ID
