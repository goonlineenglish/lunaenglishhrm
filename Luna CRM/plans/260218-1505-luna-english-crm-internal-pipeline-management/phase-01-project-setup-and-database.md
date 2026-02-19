# Phase 01: Project Setup & Database

## Context Links

- Parent plan: [plan.md](./plan.md)
- Dependencies: None (first phase)
- Research: [Tech Stack](./research/researcher-01-nextjs-supabase-stack.md)

## Overview

- **Date:** 2026-02-18
- **Priority:** P1
- **Status:** Pending
- **Effort:** 5h

Initialize Next.js 15 project with TypeScript, Tailwind, shadcn/ui. Configure Supabase (local dev + cloud). Create full database schema with RLS policies. Seed pipeline stages and sample data.

## Key Insights

- Next.js 15: `cookies()` is async, must `await` in server client
- Use `@supabase/ssr` (not `@supabase/auth-helpers-nextjs` which is deprecated)
- RLS policies must be set up from day one to avoid security refactors
- Supabase free tier: 500MB DB, 50k MAU, 5GB bandwidth -- more than sufficient
- Always use `getUser()` not `getSession()` server-side (CVE-2025-29927)

## Requirements

### Functional
- Next.js 15 project with App Router, TypeScript strict mode
- Supabase project (local dev via CLI + cloud deployment)
- All 5 core tables created with proper types, constraints, indexes
- RLS policies for 3 roles (admin, advisor, marketing)
- Seed script: admin user, pipeline stages, 10 sample leads
- Environment variables configured (.env.local)

### Non-functional
- TypeScript strict mode, no `any`
- Path aliases (`@/` for root)
- ESLint + Prettier configured
- Supabase migrations tracked in version control

## Architecture

```
luna-english-crm/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx               # Dashboard home (redirect)
│   │   ├── pipeline/
│   │   ├── students/
│   │   ├── reminders/
│   │   ├── reports/
│   │   └── settings/
│   ├── api/
│   │   └── webhooks/
│   │       ├── zalo/route.ts
│   │       └── facebook/route.ts
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Landing redirect
├── components/
│   ├── ui/                        # shadcn/ui components
│   ├── pipeline/                  # Kanban-specific
│   ├── layout/                    # Sidebar, header
│   └── shared/                    # Reusable (badges, cards)
├── lib/
│   ├── supabase/
│   │   ├── server.ts              # Server-side client
│   │   ├── client.ts              # Browser client
│   │   └── middleware.ts          # Auth middleware helper
│   ├── constants/
│   │   ├── pipeline-stages.ts     # 8 stages definition
│   │   └── roles.ts               # Role constants
│   ├── types/
│   │   ├── database.ts            # Supabase generated types
│   │   ├── leads.ts               # Lead-related types
│   │   └── users.ts               # User types
│   ├── utils/
│   │   └── format.ts              # Date, phone formatters
│   └── actions/                   # Server actions
│       ├── lead-actions.ts
│       ├── student-actions.ts
│       └── auth-actions.ts
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 001_create-users-table.sql
│   │   ├── 002_create-leads-table.sql
│   │   ├── 003_create-lead-activities-table.sql
│   │   ├── 004_create-follow-up-reminders-table.sql
│   │   ├── 005_create-students-table.sql
│   │   ├── 006_create-notifications-table.sql
│   │   ├── 007_create-integration-tokens-table.sql
│   │   ├── 008_create-webhook-events-table.sql
│   │   └── 009_create-rls-policies.sql
│   └── seed.sql
├── middleware.ts                   # Next.js middleware (auth)
├── tailwind.config.ts
├── next.config.ts
├── .env.local.example
├── package.json
└── tsconfig.json
```

## Related Code Files

### Files to Create

| File | Purpose |
|------|---------|
| `package.json` | Dependencies: next, react, @supabase/ssr, @supabase/supabase-js, @dnd-kit/core, @dnd-kit/sortable, tailwindcss, shadcn/ui |
| `tsconfig.json` | TypeScript strict, path aliases `@/*` |
| `next.config.ts` | Next.js 15 config |
| `tailwind.config.ts` | Luna brand colors, custom theme |
| `.env.local.example` | NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY |
| `middleware.ts` | Auth session refresh middleware |
| `lib/supabase/server.ts` | Server-side Supabase client (async cookies) |
| `lib/supabase/client.ts` | Browser-side Supabase client |
| `lib/supabase/middleware.ts` | Middleware helper for session refresh |
| `lib/constants/pipeline-stages.ts` | 8 stages with Vietnamese labels, colors, SLA config |
| `lib/constants/roles.ts` | Role enum + permission map |
| `lib/types/database.ts` | Auto-generated from `supabase gen types` |
| `lib/types/leads.ts` | Lead, LeadActivity, LeadSource, PipelineStage types |
| `lib/types/users.ts` | User, UserRole types |
| `lib/utils/format.ts` | formatPhone(), formatDate(), formatRelativeTime() |
| `app/layout.tsx` | Root layout with fonts, metadata |
| `app/page.tsx` | Redirect to /login or /pipeline |
| `supabase/config.toml` | Local dev config |
| `supabase/migrations/001_create-users-table.sql` | users table + trigger for auth.users sync |
| `supabase/migrations/002_create-leads-table.sql` | leads table with all columns, indexes |
| `supabase/migrations/003_create-lead-activities-table.sql` | lead_activities table |
| `supabase/migrations/004_create-follow-up-reminders-table.sql` | follow_up_reminders table |
| `supabase/migrations/005_create-students-table.sql` | students table |
| `supabase/migrations/006_create-notifications-table.sql` | notifications table for in-app notifications |
| `supabase/migrations/007_create-integration-tokens-table.sql` | integration_tokens with Vault encryption |
| `supabase/migrations/008_create-webhook-events-table.sql` | webhook_events for logging |
| `supabase/migrations/009_create-rls-policies.sql` | All RLS policies for all tables |
| `supabase/seed.sql` | Admin user, 10 sample leads, sample activities |

## Implementation Steps

1. **Create Next.js 15 project**
   ```bash
   npx create-next-app@latest luna-english-crm --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
   ```

2. **Install dependencies**
   ```bash
   npm install @supabase/supabase-js @supabase/ssr
   npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
   npm install recharts date-fns
   npm install -D supabase
   npx shadcn@latest init
   ```

3. **Add shadcn/ui components**
   ```bash
   npx shadcn@latest add button card input label badge sheet dialog command calendar table toast dropdown-menu separator avatar scroll-area select tabs textarea popover
   ```

4. **Configure Tailwind** with Luna brand colors:
   - Primary: `#3E1A51` (purple)
   - Secondary: `#3FA5DC` (blue)
   - Success: `#00B273` (green)
   - Warning: `#FFC021` (yellow)
   - Danger: `#EC3563` (pink)

5. **Create `.env.local.example`** with all required env vars

6. **Setup Supabase local dev**
   ```bash
   npx supabase init
   npx supabase start
   ```

7. **Write migration 001**: users table
   ```sql
   CREATE TABLE public.users (
     id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
     email TEXT UNIQUE NOT NULL,
     full_name TEXT NOT NULL,
     role TEXT NOT NULL CHECK (role IN ('admin', 'advisor', 'marketing')),
     is_active BOOLEAN DEFAULT true,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   -- Trigger: auto-create user row when auth.users signs up
   ```

8. **Write migration 002**: leads table
   ```sql
   CREATE TYPE lead_source AS ENUM ('facebook', 'zalo', 'walk_in', 'website', 'phone', 'referral');
   CREATE TYPE lead_stage AS ENUM ('moi_tiep_nhan', 'da_tu_van', 'dang_nurture', 'dat_lich_hoc_thu', 'dang_hoc_thu', 'cho_chot', 'da_dang_ky', 'mat_lead');
   CREATE TYPE program_type AS ENUM ('buttercup', 'primary_success', 'secondary', 'ielts');

   CREATE TABLE public.leads (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     student_name TEXT,
     student_dob DATE,
     parent_name TEXT NOT NULL,
     parent_phone TEXT NOT NULL,
     parent_email TEXT,
     parent_address TEXT,
     source lead_source NOT NULL DEFAULT 'walk_in',
     referral_code TEXT,
     program_interest program_type,
     current_stage lead_stage NOT NULL DEFAULT 'moi_tiep_nhan',
     assigned_to UUID REFERENCES public.users(id),
     expected_class TEXT,
     notes TEXT,
     lost_reason TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   CREATE INDEX idx_leads_stage ON public.leads(current_stage);
   CREATE INDEX idx_leads_assigned ON public.leads(assigned_to);
   CREATE INDEX idx_leads_source ON public.leads(source);
   CREATE INDEX idx_leads_created ON public.leads(created_at DESC);
   ```

9. **Write migrations 003-008**: remaining tables (lead_activities, follow_up_reminders, students, notifications, integration_tokens, webhook_events)

10. **Write migration 009**: RLS policies
    - Admin: full access to all tables
    - Advisor: read/write leads assigned to them, read all leads, write own activities
    - Marketing: read-only on leads and activities, no access to settings

11. **Create seed.sql**: 1 admin user, 2 advisors, 10 sample leads across stages, 5 activities

12. **Create Supabase client files**: `lib/supabase/server.ts`, `lib/supabase/client.ts`, `lib/supabase/middleware.ts`

13. **Create type definitions**: `lib/types/database.ts`, `lib/types/leads.ts`, `lib/types/users.ts`

14. **Create constants**: `lib/constants/pipeline-stages.ts`, `lib/constants/roles.ts`

15. **Create utility helpers**: `lib/utils/format.ts`

16. **Create root layout and redirect page**

17. **Run migrations and verify**
    ```bash
    npx supabase db reset
    npx supabase gen types typescript --local > lib/types/database.ts
    ```

## Todo List

- [ ] Create Next.js 15 project with TypeScript + Tailwind
- [ ] Install all dependencies (@supabase/ssr, @dnd-kit, shadcn/ui, recharts)
- [ ] Add all required shadcn/ui components
- [ ] Configure Tailwind with Luna brand colors
- [ ] Create .env.local.example
- [ ] Initialize Supabase local dev
- [ ] Write migration 001: users table
- [ ] Write migration 002: leads table
- [ ] Write migration 003: lead_activities table
- [ ] Write migration 004: follow_up_reminders table
- [ ] Write migration 005: students table
- [ ] Write migration 006: notifications table
- [ ] Write migration 007: integration_tokens table
- [ ] Write migration 008: webhook_events table
- [ ] Write migration 009: RLS policies
- [ ] Create seed.sql with sample data
- [ ] Create Supabase server + client helpers
- [ ] Create TypeScript types
- [ ] Create constants (pipeline stages, roles)
- [ ] Create utility functions
- [ ] Create root layout + redirect page
- [ ] Run migrations, verify schema
- [ ] Generate TypeScript types from DB

## Success Criteria

- `npm run dev` starts without errors
- Supabase local running with all tables created
- RLS policies enforced (test with different role tokens)
- Seed data visible in Supabase Studio
- TypeScript types generated and importable
- All shadcn/ui components available

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Supabase CLI version mismatch | Migrations fail | Pin supabase CLI version in package.json |
| shadcn/ui breaking changes | Component errors | Use latest stable, pin version |
| RLS policies too restrictive | Features blocked | Test policies with seed data early |

## Security Considerations

- `.env.local` excluded from git (in .gitignore)
- Service role key NEVER exposed to client
- RLS policies enforce role-based access at DB level
- `getUser()` used exclusively (not `getSession()`)
- PII (phone, email) encrypted at rest by Supabase

## Next Steps

- Phase 2 depends on: Supabase client helpers, root layout, middleware
- Provide generated types to Phase 2 for type-safe components
