# Luna English CRM

Hệ thống quản lý tuyển sinh và chăm sóc học sinh Luna English (cơ sở Tân Mai). All 10 phases complete. Deployed to Supabase Cloud, Docker/Caddy ready.

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
│   ├── activities/         # Global scheduled activities view
│   ├── reports/            # KPI dashboard
│   └── settings/           # Integration config
├── api/
│   ├── webhooks/           # Zalo + Facebook inbound
│   └── cron/               # 4 scheduled tasks (15min-weekly)
└── globals.css             # Tailwind v4 theme

components/
├── ui/                     # 19 shadcn/ui base components
├── pipeline/               # 23 Kanban + activity + communication components
├── students/               # 11 enrollment components
├── dashboard/              # 7 KPI + chart components
├── reminders/              # 4 reminder components
├── settings/               # 6 integration + stage config components
├── layout/                 # 8 sidebar/header components
└── auth/                   # 1 login component

lib/
├── actions/                # 15 server actions
├── hooks/                  # 3 realtime + optimistic hooks
├── integrations/           # Zalo/Facebook clients + handlers + queue
├── supabase/               # Client + server + admin helpers
├── constants/              # Navigation, stages, roles, reminder types
├── types/                  # TypeScript interfaces
└── utils/                  # Format, CSV parser, template renderer

supabase/
├── migrations/             # 24 SQL files (001-024)
└── seed.sql                # Sample data

docs/
├── project-overview-pdr.md # Business context, features
├── codebase-summary.md     # File index, counts
├── system-architecture.md  # Stack, DB schema, data flow
├── code-standards.md       # TypeScript, components, styling
├── development-roadmap.md  # 10 phases (all complete)
├── deployment-guide.md     # Docker/Caddy + Vercel setup
├── design-guidelines.md    # Colors, typography, layout
└── project-changelog.md    # Version history
```

## Development

- **All 10 phases complete**: Setup, Auth, Pipeline, Reminders, Students, Dashboard, Integrations, Deployment, Testing, Enhanced Activities & Communication
- **Supabase Cloud deployed** (Singapore): vgxpucmwivhlgvlzzkju.supabase.co
- **GitHub**: goonlineenglish/luna-english-crm (main branch)
- **Docker + Caddy**: Homeserver deployment ready (see deployment-guide.md)
- **Vercel**: Alternative cloud deployment (vercel.json configured with all 4 crons)

See `docs/development-roadmap.md` for phase details and `docs/deployment-guide.md` for deployment steps.
