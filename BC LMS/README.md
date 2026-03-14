# Buttercup LMS

Internal Learning Management System for Buttercup Learning teacher training. Manage ~100 teachers across three English programs (Buttercup, Primary Success, Primary Secondary) with course delivery, progress tracking, and lesson plan building.

## Tech Stack

| Component | Technology | Notes |
|-----------|-----------|-------|
| **Framework** | Next.js 16.1.6 (App Router) | Server components, server actions |
| **Database** | PostgreSQL + Prisma v7 ORM | 10 models, soft delete pattern, PrismaPg adapter |
| **Authentication** | Custom JWT + Sessions | httpOnly cookies, DB-backed sessions, proxy.ts at root |
| **UI Library** | shadcn/ui + Tailwind v4 | Component-based, accessible |
| **Rich Editor** | Tiptap | Lesson content, lesson plan builder |
| **Video Platform** | Google Drive (current) | Embedded streaming |
| **File Storage** | Cloudflare R2 | Material uploads (PDF, images, audio) |
| **Content Protection** | Custom DRM | Watermark (8px blur), page blur, CSS-scoped |
| **Deployment** | Docker + Caddy | Single VPS, 2-4 CPU, 4GB RAM, 50GB SSD |

## Project Status

**ALL 4 PHASES COMPLETE as of 2026-03-04**
- 44 routes implemented (app/ pages + API)
- 123 unit tests passing (7 test files)
- Build clean
- R2 integration for material storage complete

Phases 1-4 successfully delivered with full feature set.

## Quick Start (for Development)

### Prerequisites (Before Starting Phase 1)
- Node.js 20+
- PostgreSQL 15+ (or Supabase PostgreSQL)
- Docker & Docker Compose (for deployment)
- Git

### First Time Setup
```bash
# Clone repository
git clone <repo-url>
cd bc-lms

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Edit .env.local with your database credentials and secrets

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

Server runs on `http://localhost:3000`. All phases are complete and ready to use.

### Required Environment Variables
```
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/bc_lms

# Authentication
JWT_SECRET=your-random-secret-min-32-chars
CRON_SECRET=your-random-cron-secret-min-32-chars

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Cloudflare R2 (Material Storage)
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=your-bucket-name
```

See `.env.example` for full list.

## Folder Structure (Planned)

```
bc-lms/                           # Project root
├── app/                          # Next.js App Router (Phase 1+)
│   ├── (auth)/login/            # Login page
│   ├── (dashboard)/             # Teacher dashboard routes
│   │   ├── courses/[id]/        # Course player
│   │   ├── courses/             # Courses listing page
│   │   ├── profile/             # Teacher profile
│   │   ├── lesson-plans/        # Lesson plan list & editor
│   │   ├── templates/           # Read-only template viewer
│   │   ├── reports/             # Manager school reports
│   │   └── page.tsx             # Dashboard home
│   ├── admin/                   # Admin panel
│   │   ├── users/
│   │   ├── programs/
│   │   ├── courses/
│   │   ├── reports/
│   │   └── templates/
│   ├── api/                     # REST API routes
│   │   ├── auth/
│   │   ├── courses/
│   │   ├── progress/
│   │   ├── lesson-plans/
│   │   ├── cron/
│   │   └── health/
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Home redirect
├── lib/
│   ├── actions/                 # Server actions
│   ├── services/                # Business logic
│   ├── auth/                    # Auth helpers
│   ├── types/                   # TypeScript definitions
│   ├── prisma.ts                # Database client
│   └── utils.ts
├── components/                  # React components
├── public/                      # Static assets
├── prisma/
│   └── schema.prisma            # Database schema
├── tests/                       # Test files
├── middleware.ts                # Auth guard
└── README.md
```

See `./docs/codebase-summary.md` for complete folder tree.

## Documentation

Full documentation available in `./docs/`:
- **[Project Overview & PDR](./docs/project-overview-pdr.md)** — Features, requirements, success criteria
- **[System Architecture](./docs/system-architecture.md)** — Tech layers, auth flow, access control
- **[Code Standards](./docs/code-standards.md)** — File structure, patterns, conventions
- **[Design Guidelines](./docs/design-guidelines.md)** — UI/UX, components, DRM styling
- **[Deployment Guide](./docs/deployment-guide.md)** — Docker, Caddy, environment setup
- **[Project Roadmap](./docs/project-roadmap.md)** — 4 phases, milestones, verification
- **[Codebase Summary](./docs/codebase-summary.md)** — Current status, database schema

## Development Workflow

1. **Plan** — Define requirements in `./docs`; implementation plans in `./plans`
2. **Implement** — Follow code standards; max 200 LOC per file
3. **Test** — Run `npm test` before commit
4. **Lint** — Run `npm run lint` before push
5. **Review** — Code review checklist in PR template
6. **Deploy** — Docker build → VPS with Caddy reverse proxy

## Key Features (By Phase)

**Phase 1 — Foundation** (Auth, User CRUD, Program & Course CRUD, Teacher dashboard)
**Phase 2 — Learning** (Course player, progress tracking, teacher profile, search)
**Phase 3 — Lesson Plan Builder** (Tiptap editor, per-program templates, save/edit/list)
**Phase 4 — Security & Polish** (DRM, watermark, page blur, admin reports, favorites, R2 file storage)

## Support & Maintenance

- **Database migrations**: `npx prisma migrate dev`
- **Schema updates**: Edit `prisma/schema.prisma` then migrate
- **Session cleanup**: Runs via `GET /api/cron/session-cleanup` (protected by `CRON_SECRET`)
- **DRM protection**: Enabled in lesson player (8px blur, watermark overlay)
- **Tests**: `npm test` (123 tests passing, 7 files)
- **Build**: `npm run build` (currently clean)

## License

Internal use only — Buttercup Learning.
