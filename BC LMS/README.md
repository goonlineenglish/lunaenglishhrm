# Buttercup LMS

Internal Learning Management System for Buttercup Learning teacher training. Manage ~100 teachers across three English programs (Buttercup, Primary Success, Primary Secondary) with course delivery, progress tracking, and lesson plan building.

## Tech Stack

| Component | Technology | Notes |
|-----------|-----------|-------|
| **Framework** | Next.js 15 (App Router) | Server components, server actions |
| **Database** | PostgreSQL + Prisma ORM | 9 models, soft delete pattern |
| **Authentication** | Custom JWT + Sessions | httpOnly cookies, DB-backed sessions |
| **UI Library** | shadcn/ui + Tailwind v4 | Component-based, accessible |
| **Rich Editor** | Tiptap | Lesson content, lesson plan builder |
| **Video Platform** | Google Drive (Phase 1-3) → Bunny.net (Phase 4) | Embedded streaming |
| **Content Protection** | Custom DRM | Watermark, page blur, CSS-scoped |
| **Deployment** | Docker + Caddy | Single VPS, 2-4 CPU, 4GB RAM, 50GB SSD |

## Project Status

This project is currently in the **planning and documentation phase**. Architecture, database schema, and feature specifications are finalized. **No source code has been implemented yet.**

Phases 1-4 are scheduled for sequential development starting after project initialization.

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

# Initialize database (Phase 1)
npx prisma migrate dev --name init

# Start development server
npm run dev
```

Server runs on `http://localhost:3000` once Phase 1 is complete.

### Required Environment Variables
```
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/bc_lms

# Authentication
JWT_SECRET=your-random-secret-min-32-chars

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

See `.env.example` for full list. External service keys (Google Drive, Bunny.net) added in Phases 2 and 4.

## Folder Structure (Planned)

```
bc-lms/                           # Project root
├── app/                          # Next.js App Router (Phase 1+)
│   ├── (auth)/login/            # Login page
│   ├── (dashboard)/             # Teacher dashboard routes
│   │   ├── courses/[id]/        # Course player
│   │   ├── profile/             # Teacher profile
│   │   └── lesson-plans/        # Lesson plan list & editor
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
│   │   └── lesson-plans/
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
├── docker-compose.yml
├── Dockerfile
├── Caddyfile
├── next.config.ts
├── tsconfig.json
├── package.json
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
**Phase 4 — Security & Polish** (DRM, watermark, page blur, admin reports, favorites)

## Support & Maintenance

- **Database migrations**: `npx prisma migrate dev`
- **Schema updates**: Edit `prisma/schema.prisma` then migrate
- **Session cleanup**: Cron job deletes expired sessions daily
- **DRM protection**: Enabled in lesson player (Phase 4)

## License

Internal use only — Buttercup Learning.
