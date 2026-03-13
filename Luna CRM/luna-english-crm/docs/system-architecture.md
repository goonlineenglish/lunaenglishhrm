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
| Google Sheets | googleapis | ^4 |

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
├── ui/                     # 19 shadcn/ui base components
├── pipeline/               # 23 Kanban + lead + activity + communication components
├── students/               # 11 enrollment components
├── dashboard/              # 7 KPI + chart components
├── reminders/              # 4 reminder components
├── settings/               # 6 integration + stage config components
├── layout/                 # 8 sidebar/header components
└── auth/                   # 1 login form

lib/
├── actions/                # 15 server action files
├── hooks/                  # 3 realtime + optimistic
├── integrations/           # 7 Zalo, Facebook, queue, dedup
├── queries/                # Dashboard SQL queries
├── supabase/               # Client/server/admin/middleware
├── constants/              # Navigation, stages, roles
├── types/                  # TypeScript interfaces
└── utils/                  # Format, CSV, referral codes, template renderer

supabase/
├── migrations/             # 24 SQL files (001-024)
└── seed.sql                # 10 sample leads
```

## Database Schema (35 migrations)

### Soft Delete (Migration 035)
Soft delete pattern implemented across 4 tables using `deleted_at TIMESTAMPTZ DEFAULT NULL`:

**Affected Tables**: leads, students, lead_activities, lead_stage_notes

**Architecture**:
- Partial indexes (idx_leads_active, idx_students_active, idx_lead_activities_active) for fast active-record queries
- RLS policies: advisor/marketing roles auto-filter `WHERE deleted_at IS NULL`
- Admin queries use getAdminClient() to bypass RLS and view trash
- Database cascade trigger: soft-deleting a lead auto-cascades delete_at to all child activities + stage notes
- Restore uses timestamp matching (restores only items cascade-deleted at same time as parent) to maintain data integrity
- Dashboard views updated: lead_funnel, lead_source_breakdown, advisor_performance, monthly_lead_trend filter `deleted_at IS NULL`
- find_stale_leads() RPC excludes soft-deleted leads

**Permissions**:
- Admin: full delete + restore access; sees all records in `/trash` (3 tabs: leads, students, activities)
- Advisor: can delete own leads + own activities; cannot restore
- Marketing: no delete access

**UI Components**:
- DeleteConfirmationDialog (shared): reusable confirmation modal for all delete operations
- /trash page: admin-only trash view with tabbed interface
- 3 trash tables (DeletedLeadsTable, DeletedStudentsTable, DeletedActivitiesTable): restore buttons + deletion timestamps

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

### Activity & Communication Tables (7)
| Table | Migration | Purpose | RLS |
|-------|-----------|---------|-----|
| lead_stage_notes | 016 | Per-stage notes/results/next-steps per lead | advisor=own, admin=all |
| stage_next_step_configs | 017 | Configurable checklists per pipeline stage (7 stages seeded) | admin=write, all=read |
| email_templates | 018 | Email templates with {{var}} placeholders | admin=write, all=read |
| zalo_message_templates | 019 | Zalo OA message templates with placeholders | admin=write, all=read |
| lead_activities (scheduling) | 020 | Added scheduling columns (scheduled_at, recurrence, participants) | follows lead |
| stage_next_step_configs (RLS) | 020 | RLS policies added | admin=write, all=read |
| lead_stage_notes (RLS) | 020 | RLS policies added | advisor=own, admin=all |

### Support Tables (7)
- message_queue — outbound messages (retry logic, exponential backoff, claimed_at dedup)
- zalo_followers — Zalo OA follower mapping
- reports — periodic report storage
- lead_activities (triggers) — migration 021 extends stage→checklist trigger
- migration 022 — notification dedup index + other enhancements
- migration 023 — message queue claimed_at for reclamation
- migration 024 — backfill missing user profiles for ensure-user-profile pattern

### Enums & Views
**Enums**: lead_stage (8), lead_source (5), program_type (3), activity_type (10: call, sms, email, zalo_message, meeting, note, stage_change, scheduled_call, trial_class, consultation, checklist), reminder_type (4), reminder_status (3), student_status (3), renewal_status (3)

**Dashboard Views**:
- lead_funnel — leads per stage
- lead_source_breakdown — leads grouped by source
- advisor_performance — conversions + metrics per advisor
- monthly_lead_trend — monthly new lead counts

**RPC Functions**:
- find_stale_leads(days) — detect leads idle in current stage beyond threshold

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
| /api/cron/sync-google-sheets | every 15min | CRON_SECRET |

All cron routes fail-closed: deny without CRON_SECRET env var.

The `check-overdue-reminders` cron handles 4 sections:
1. Overdue follow-up reminders
2. Activity deadline notifications
3. Stale lead detection (via `find_stale_leads()` RPC)
4. Trial class Zalo auto-reminder (24h before)

The `sync-google-sheets` cron syncs 5 tabs one-way from Supabase to Google Sheets:
1. Leads — lead records with current stage, source, advisor
2. Học viên — enrolled students with status and renewal dates
3. Hoạt động — all lead activities with types and timestamps
4. Nhắc nhở — follow-up reminders with status and due dates
5. Tổng quan — summary metrics (total leads, conversion rate, etc.)

## Environment Variables (New for Activities & Communication)
| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Resend email API key |
| `EMAIL_FROM` | Sender email address (e.g., `noreply@luna.edu.vn`) |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Google Service Account JSON key for Sheets API auth |
| `GOOGLE_SHEET_ID` | Target Google Sheet ID for sync destination |

## Auth Flow
1. User submits email/password on `/login`
2. Supabase Auth validates, returns session token
3. Server action `ensureUserProfile()` creates user profile with default role (admin→advisor conversion after initial setup)
4. Middleware refreshes session on every request
5. Server components use `supabase.auth.getUser()` (never `getSession()`)
6. RLS policies enforce data access based on role + user ID
