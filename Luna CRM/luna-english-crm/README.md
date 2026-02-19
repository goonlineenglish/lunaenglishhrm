# Luna English CRM

Hệ thống quản lý tuyển sinh và chăm sóc học sinh Luna English (cơ sở Tân Mai).

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **Supabase** (PostgreSQL, Auth, Realtime, Edge Functions)
- **shadcn/ui** + Tailwind CSS v4
- **@dnd-kit** (Kanban drag-and-drop)
- **Recharts** (Dashboard charts)

## Getting Started

### Prerequisites

- Node.js >= 20
- npm >= 10
- Docker (for Supabase local dev)

### Setup

```bash
cd luna-english-crm

# Install dependencies
npm install

# Copy env file and fill in Supabase credentials
cp .env.local.example .env.local

# Start Supabase local (requires Docker)
npx supabase start

# Apply migrations
npx supabase db reset

# Generate TypeScript types from DB
npx supabase gen types typescript --local > lib/types/database.ts

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
luna-english-crm/
├── app/                    # Next.js App Router pages
│   ├── login/              # Login page (Phase 2)
│   ├── layout.tsx          # Root layout (Vietnamese, Sonner toasts)
│   └── page.tsx            # Redirect to /login
├── components/ui/          # shadcn/ui components
├── lib/
│   ├── supabase/           # Supabase server/client/middleware helpers
│   ├── constants/          # Pipeline stages, roles
│   ├── types/              # TypeScript types (leads, users, database)
│   └── utils/              # Formatters (date, phone)
├── supabase/
│   ├── migrations/         # 9 SQL migration files
│   └── seed.sql            # Sample data (10 leads)
└── middleware.ts            # Auth session refresh
```

## Implementation Plan

See [plans/](../plans/260218-1505-luna-english-crm-internal-pipeline-management/plan.md) for the 7-phase implementation plan.
