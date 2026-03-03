# Phase 01: Project Init & Database Schema — Implementation Report

**Date**: 2026-03-03
**Status**: COMPLETED

## Files Modified / Created

| File | Status | Notes |
|------|--------|-------|
| `app/layout.tsx` | Pre-existing | Buttercup LMS metadata, lang=vi, bg-neutral-50 |
| `app/page.tsx` | Pre-existing | redirect("/login") |
| `lib/prisma.ts` | Updated | Added PrismaPg adapter (Prisma v7 requirement) |
| `lib/utils.ts` | Pre-existing | cn() helper |
| `prisma/schema.prisma` | Pre-existing | 9 models + 3 enums, valid |
| `prisma/seed.ts` | Updated | Added dotenv, Pool, PrismaPg adapter |
| `prisma.config.ts` | Updated | Added seed command (tsx), migration path |
| `prisma/migrations/20260302170755_init/` | Created | Migration SQL for all 9 tables |
| `proxy.ts` | Created | Replaces middleware.ts (Next.js 16 convention) |
| `.env.example` | Pre-existing | DATABASE_URL + JWT_SECRET + APP_URL |
| `components/ui/` | Pre-existing | 14 shadcn components |
| `package.json` | Updated | Added @prisma/adapter-pg, pg, tsx, @types/pg |

## Tasks Completed

- [x] Scaffold Next.js 16.1.6 project with App Router, TypeScript strict
- [x] Install dependencies: prisma, @prisma/client, bcrypt, jose, zod, @prisma/adapter-pg, pg, tsx
- [x] Install shadcn/ui components (14 components)
- [x] Prisma schema: 9 models + 3 enums (Role, CourseLevel, CourseType)
- [x] Prisma singleton: lib/prisma.ts with PrismaPg adapter
- [x] Utility: lib/utils.ts with cn()
- [x] Seed script: admin user + 3 programs
- [x] .env.example created
- [x] Root layout + home page redirect
- [x] Run migration: 20260302170755_init — all 9 tables created
- [x] Run seed: admin@buttercuplearning.com + Buttercup, Primary Success, Primary Secondary
- [x] npm run build: PASS
- [x] npm run lint: PASS (0 errors, 1 expected warning)
- [x] git commit: 32dd366

## Tests Status

- Type check: PASS (via next build TypeScript check)
- Build: PASS — `next build` succeeds cleanly
- Lint: PASS — 0 errors, 1 warning (`_request` unused in proxy.ts placeholder — expected)
- DB migration: PASS — 9 tables confirmed in PostgreSQL
- DB seed: PASS — 1 admin user + 3 programs

## Deviations from Plan

1. **Prisma v7 adapter pattern**: Prisma v7's new TypeScript-native client requires a `PrismaPg` adapter instead of auto-reading `DATABASE_URL`. Updated `lib/prisma.ts` and `prisma/seed.ts` to use `@prisma/adapter-pg`.

2. **proxy.ts not middleware.ts**: Next.js 16 deprecates `middleware.ts` in favor of `proxy.ts` with exported `proxy` function. Renamed accordingly.

3. **Seed command uses tsx**: Prisma v7's `prisma.config.ts` seed config doesn't support `ts-node` with `moduleResolution: bundler`. Changed to `npx tsx prisma/seed.ts`.

4. **Docker PostgreSQL**: No local PostgreSQL running. Spun up `postgres:15-alpine` Docker container (`bc-lms-postgres`) to run migration + seed.

## Infrastructure Notes

- PostgreSQL running in Docker: `bc-lms-postgres` on `localhost:5432`
- DB: `bc_lms`, user: `bc_lms_user`
- Must start container before running `prisma migrate` or `prisma db seed`

## Next Steps

Phase 02 (Authentication System) can now begin:
- Implement JWT auth service (login, logout)
- Implement proxy.ts (auth guard) — currently a pass-through placeholder
- Note: proxy.ts exports `proxy` function (not `middleware`) per Next.js 16
