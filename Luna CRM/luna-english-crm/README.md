# Luna English CRM

Hệ thống quản lý tuyển sinh và chăm sóc học sinh Luna English (cơ sở Tân Mai). All 9 phases complete. Deployed to Supabase Cloud, ready for Vercel.

## Tech Stack

- **Framework**: Next.js 16.1.6 (App Router, TypeScript strict, Turbopack)
- **Styling**: Tailwind CSS v4 (CSS-first config)
- **Database**: Supabase (PostgreSQL, Auth, Realtime, RLS)
- **UI**: shadcn/ui, Sonner toasts, @tanstack/react-table
- **Interactions**: @dnd-kit (drag-drop), Recharts (charts), cmdk (search)

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000 → Login with test admin account.

**Windows cleanup:**
```bash
taskkill /f /im node.exe && rm -rf .next && npm run dev
```

## Project Structure

```
app/
├── (auth)/login/           # Login page
├── (dashboard)/            # Protected routes (sidebar + header)
│   ├── pipeline/           # Kanban board (8 stages)
│   ├── reminders/          # Follow-up reminders
│   ├── students/           # Enrollment management
│   ├── reports/            # KPI dashboard
│   └── settings/           # Integration config
├── api/
│   ├── webhooks/           # Zalo + Facebook inbound
│   └── cron/               # 4 scheduled tasks (15min-weekly)
└── globals.css             # Tailwind v4 theme

components/
├── ui/                     # 13 shadcn/ui base components
├── pipeline/               # 14 Kanban components
├── students/               # 10 enrollment components
├── dashboard/              # 7 KPI + chart components
├── reminders/              # 4 reminder components
├── settings/               # 4 integration components
├── layout/                 # 7 sidebar/header components
└── auth/                   # 1 login component

lib/
├── actions/                # 9 server actions
├── hooks/                  # 3 realtime + optimistic hooks
├── integrations/           # Zalo/Facebook clients + handlers
├── supabase/               # Client + server helpers
├── constants/              # Navigation, stages, roles
├── types/                  # TypeScript interfaces
└── utils/                  # Formatters, CSV parser

supabase/
├── migrations/             # 15 SQL files (001-015)
└── seed.sql                # 10 sample leads

docs/
├── project-overview-pdr.md # Business context, features
├── codebase-summary.md     # File index, counts
├── system-architecture.md  # Stack, DB schema, data flow
├── code-standards.md       # TypeScript, components, styling
├── development-roadmap.md  # 9 phases + validation
├── deployment-guide.md     # Supabase + Vercel setup
├── design-guidelines.md    # Colors, typography, layout
└── project-changelog.md    # Version history
```

## Development

- **All 9 phases complete**: Setup, Auth, Pipeline, Reminders, Students, Dashboard, Integrations, Deployment, Testing
- **Supabase Cloud deployed** (Singapore): vgxpucmwivhlgvlzzkju.supabase.co
- **GitHub**: goonlineenglish/luna-english-crm (main branch)
- **Vercel**: Planned (connect repo + set env vars)

See `docs/development-roadmap.md` for phase details and `docs/deployment-guide.md` for Vercel steps.
