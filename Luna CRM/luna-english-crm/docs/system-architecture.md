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
| Date | date-fns | ^4.1.0 |

## Application Architecture

```
┌──────────────────────────────────────────────┐
│                   Browser                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Pipeline  │  │ Students │  │Dashboard │   │
│  │ (Kanban)  │  │ (Table)  │  │ (Charts) │   │
│  └─────┬─────┘  └─────┬────┘  └────┬─────┘   │
│        │              │             │          │
│  ┌─────┴──────────────┴─────────────┴──────┐  │
│  │       Client Components (React 19)       │  │
│  │  Realtime hooks, optimistic updates      │  │
│  └─────────────────┬───────────────────────┘  │
└────────────────────┼──────────────────────────┘
                     │ Server Actions
┌────────────────────┼──────────────────────────┐
│  Next.js Server    │                          │
│  ┌─────────────────┴───────────────────────┐  │
│  │         Server Actions (lib/actions/)    │  │
│  │  lead, reminder, student, auth, etc.     │  │
│  └─────────────────┬───────────────────────┘  │
│  ┌─────────────────┴───────────────────────┐  │
│  │      API Routes (app/api/)              │  │
│  │  Webhooks: Zalo, Facebook               │  │
│  │  Cron: reminders, tokens, reports       │  │
│  └─────────────────┬───────────────────────┘  │
│  ┌─────────────────┴───────────────────────┐  │
│  │      Middleware (auth session refresh)   │  │
│  └─────────────────┬───────────────────────┘  │
└────────────────────┼──────────────────────────┘
                     │
┌────────────────────┼──────────────────────────┐
│  Supabase Cloud    │                          │
│  ┌─────────────────┴───────────────────────┐  │
│  │  PostgreSQL + RLS Policies              │  │
│  │  Auth (email/password)                  │  │
│  │  Realtime subscriptions                 │  │
│  │  Triggers (stage→reminder, enrollment)  │  │
│  └─────────────────────────────────────────┘  │
└───────────────────────────────────────────────┘
```

## Directory Structure

```
luna-english-crm/
├── app/
│   ├── (auth)/login/           # Public: login page
│   ├── (dashboard)/            # Protected: layout with sidebar + auth check
│   │   ├── pipeline/           # Kanban board
│   │   ├── leads/              # Redirect → /pipeline
│   │   ├── reminders/          # Follow-up reminders
│   │   ├── students/           # Student management
│   │   ├── reports/            # Dashboard analytics
│   │   └── settings/           # Integration settings
│   ├── api/
│   │   ├── webhooks/{zalo,facebook}/   # Inbound webhooks
│   │   └── cron/                       # Scheduled tasks
│   ├── layout.tsx              # Root layout (fonts, metadata)
│   └── globals.css             # Tailwind v4 theme config
├── components/
│   ├── ui/                     # shadcn/ui base components
│   ├── layout/                 # Sidebar, Header, Nav, Notifications
│   ├── pipeline/               # Kanban, Lead cards, Filters
│   ├── students/               # Data table, CSV import
│   ├── reminders/              # Reminder cards, Create dialog
│   ├── dashboard/              # KPI cards, Charts
│   ├── settings/               # Integration config cards
│   └── auth/                   # Login form
├── lib/
│   ├── actions/                # 9 server actions
│   ├── constants/              # Navigation, stages, roles, reminder types
│   ├── hooks/                  # Realtime subscriptions, optimistic updates
│   ├── integrations/           # Zalo, Facebook clients + webhook handlers
│   ├── queries/                # Dashboard SQL queries
│   ├── supabase/               # Client + Server helpers
│   ├── types/                  # TypeScript types
│   └── utils/                  # Format, CSV parser, referral codes
├── supabase/
│   └── migrations/             # 15 SQL migration files (001-015)
├── middleware.ts                # Auth session refresh
└── docs/                       # Project documentation
```

## Database Schema

### Core Tables
| Table | Purpose | RLS |
|-------|---------|-----|
| users | Staff accounts (synced from auth.users) | admin=all, self=read |
| leads | Pipeline entities | admin=all, advisor=assigned |
| lead_activities | Activity log per lead | follows lead access |
| follow_up_reminders | Scheduled follow-ups | advisor=own |
| students | Enrolled students | admin=all, advisor=assigned |
| notifications | In-app notifications | user=own |

### Integration Tables
| Table | Purpose |
|-------|---------|
| integration_tokens | OAuth tokens for Zalo/Facebook |
| webhook_events | Inbound webhook log |
| message_queue | Outbound message retry queue |
| zalo_followers | Zalo OA follower mapping |
| reports | Periodic report storage |

### Database Triggers
- **Stage change → auto-reminder**: Creates follow-up when lead stage changes
- **Enrollment trigger**: Auto-creates student record at `da_dang_ky` stage

### Dashboard Views
- `lead_funnel` - Stage-wise lead counts
- `lead_source_breakdown` - Leads grouped by source
- `advisor_performance` - Per-advisor conversion metrics
- `monthly_lead_trend` - Monthly new lead counts

## Auth Flow
1. User submits email/password on `/login`
2. Supabase Auth validates credentials
3. Middleware refreshes session on every request
4. Server components use `supabase.auth.getUser()` (never `getSession()`)
5. RLS policies enforce data access based on role
