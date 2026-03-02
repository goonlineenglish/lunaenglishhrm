---
phase: 1
title: "Project Init & Database Schema"
status: pending
effort: 5h
depends_on: []
blocks: [phase-02]
---

# Phase 01: Project Init & Database Schema

## Context Links

- [System Architecture](../../docs/system-architecture.md)
- [Code Standards](../../docs/code-standards.md)
- [Codebase Summary](../../docs/codebase-summary.md)
- [Deployment Guide](../../docs/deployment-guide.md)

## Overview

**Priority**: Critical
**Status**: Pending
**Description**: Scaffold Next.js 15 project, configure Tailwind v4 + shadcn/ui, set up Prisma with PostgreSQL, define all 9 models + 2 enums, create seed script, and configure environment.

## Key Insights

- Greenfield project, zero code exists
- Prisma schema must include all 9 models from day 1 (User, Session, Program, UserProgram, Course, Lesson, Enrollment, Progress, LessonPlan)
- CourseType enum (TRAINING | MATERIAL) needed alongside CourseLevel and Role enums
- Compound unique constraints: `[programId, order]` on Course, `[courseId, order]` on Lesson
- `@default(cuid())` for all IDs
- `onDelete: Cascade` for Session, `Restrict` for content FKs

## Requirements

### Functional
- Next.js 15 project with App Router and TypeScript strict mode
- Prisma schema with all models, enums, and relations
- Database migration runs without errors
- Seed script creates admin user + 3 programs
- `.env.example` with all required variables

### Non-Functional
- `npm run build` passes
- `npm run lint` passes
- PostgreSQL 15+ compatibility
- `@/*` path alias configured

## Architecture

```
bc-lms/
├── app/
│   ├── layout.tsx         # Root layout with brand fonts
│   └── page.tsx           # Home redirect to /login
├── lib/
│   ├── prisma.ts          # Singleton Prisma client
│   └── utils.ts           # cn() helper
├── components/
│   └── ui/                # shadcn components
├── prisma/
│   ├── schema.prisma      # Full schema
│   └── seed.ts            # Seed script
├── middleware.ts           # Placeholder (populated in phase-02)
├── .env.example
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
└── package.json
```

## Related Code Files

### Create
- `prisma/schema.prisma` -- All 9 models + 3 enums
- `prisma/seed.ts` -- Admin user + 3 programs
- `lib/prisma.ts` -- Prisma singleton client
- `lib/utils.ts` -- `cn()` utility (clsx + tailwind-merge)
- `app/layout.tsx` -- Root layout with metadata
- `app/page.tsx` -- Redirect to /login
- `.env.example` -- Template env vars
- `next.config.ts` -- Next.js config
- `middleware.ts` -- Empty placeholder

## Implementation Steps

### 1. Scaffold Next.js 15 project
```bash
npx create-next-app@latest bc-lms --typescript --tailwind --eslint --app --src-dir=false --import-alias "@/*" --turbopack
cd bc-lms
```

### 2. Install core dependencies
```bash
npm install prisma @prisma/client bcrypt jose zod
npm install -D @types/bcrypt vitest
```

### 3. Install shadcn/ui
```bash
npx shadcn@latest init
# Select: New York style, Zinc base, CSS variables YES
npx shadcn@latest add button input label card table badge dialog toast tabs skeleton select checkbox
```

### 4. Create Prisma schema (`prisma/schema.prisma`)
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  MANAGER
  TEACHER
  TEACHING_ASSISTANT
}

enum CourseLevel {
  BASIC
  ADVANCED
}

enum CourseType {
  TRAINING
  MATERIAL
}

model User {
  id          String       @id @default(cuid())
  email       String       @unique
  password    String
  name        String
  school      String?
  role        Role         @default(TEACHER)
  isDeleted   Boolean      @default(false)
  programs    UserProgram[]
  enrollments Enrollment[]
  progress    Progress[]
  lessonPlans LessonPlan[]
  sessions    Session[]
  createdAt   DateTime     @default(now())

  @@index([email])
  @@index([role])
  @@map("users")
}

model Session {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  jti         String   @unique
  invalidated Boolean  @default(false)
  expiresAt   DateTime
  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([jti])
  @@map("sessions")
}

model Program {
  id                 String       @id @default(cuid())
  name               String
  slug               String       @unique
  description        String?
  isDeleted          Boolean      @default(false)
  lessonPlanTemplate String?
  courses            Course[]
  users              UserProgram[]
  lessonPlans        LessonPlan[]

  @@map("programs")
}

model UserProgram {
  userId    String
  programId String
  user      User    @relation(fields: [userId], references: [id])
  program   Program @relation(fields: [programId], references: [id])

  @@id([userId, programId])
  @@map("user_programs")
}

model Course {
  id          String      @id @default(cuid())
  programId   String
  program     Program     @relation(fields: [programId], references: [id], onDelete: Restrict)
  title       String
  description String?
  type        CourseType
  level       CourseLevel @default(BASIC)
  order       Int
  isDeleted   Boolean     @default(false)
  lessons     Lesson[]
  enrollments Enrollment[]

  @@unique([programId, order])
  @@index([programId])
  @@map("courses")
}

model Lesson {
  id        String     @id @default(cuid())
  courseId   String
  course    Course     @relation(fields: [courseId], references: [id], onDelete: Restrict)
  title     String
  content   String?
  videoUrl  String?
  materials Json?
  order     Int
  duration  Int?
  isDeleted Boolean    @default(false)
  progress  Progress[]

  @@unique([courseId, order])
  @@index([courseId])
  @@map("lessons")
}

model Enrollment {
  id         String   @id @default(cuid())
  userId     String
  courseId    String
  user       User     @relation(fields: [userId], references: [id])
  course     Course   @relation(fields: [courseId], references: [id])
  enrolledAt DateTime @default(now())

  @@unique([userId, courseId])
  @@map("enrollments")
}

model Progress {
  id          String   @id @default(cuid())
  userId      String
  lessonId    String
  user        User     @relation(fields: [userId], references: [id])
  lesson      Lesson   @relation(fields: [lessonId], references: [id])
  completed   Boolean  @default(false)
  watchedTime Int      @default(0)
  updatedAt   DateTime @updatedAt

  @@unique([userId, lessonId])
  @@map("progress")
}

model LessonPlan {
  id        String   @id @default(cuid())
  userId    String
  programId String
  user      User     @relation(fields: [userId], references: [id], onDelete: Restrict)
  program   Program  @relation(fields: [programId], references: [id], onDelete: Restrict)
  title     String
  content   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("lesson_plans")
}
```

### 5. Create Prisma singleton (`lib/prisma.ts`)
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### 6. Create utility file (`lib/utils.ts`)
```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

### 7. Create seed script (`prisma/seed.ts`)
- Hash admin password with bcrypt (12 rounds)
- Create admin user: `admin@buttercuplearning.com` / `changeme123`
- Create 3 programs: Buttercup, Primary Success, Primary Secondary
- Add `"prisma": { "seed": "ts-node prisma/seed.ts" }` to package.json

### 8. Create `.env.example`
```
DATABASE_URL=postgresql://bc_lms_user:bc_lms_password@localhost:5432/bc_lms
JWT_SECRET=your-random-secret-min-32-chars
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### 9. Create root layout (`app/layout.tsx`)
- Set metadata: title "Buttercup LMS", description
- System font stack (Inter or default sans)
- Wrap children in body with bg-neutral-50

### 10. Create home page (`app/page.tsx`)
- Server component that redirects to `/login`
- Use `redirect()` from `next/navigation`

### 11. Run migration and verify
```bash
npx prisma migrate dev --name init
npx prisma db seed
npm run build
```

## Todo List

- [ ] Scaffold Next.js 15 project
- [ ] Install dependencies (prisma, bcrypt, jose, zod, shadcn)
- [ ] Install shadcn/ui components
- [ ] Write Prisma schema (9 models, 3 enums)
- [ ] Create Prisma singleton
- [ ] Create utility helpers
- [ ] Write seed script (admin + 3 programs)
- [ ] Create .env.example
- [ ] Create root layout + home page redirect
- [ ] Run migration
- [ ] Run seed
- [ ] Verify `npm run build` passes

## Success Criteria

- `npx prisma migrate dev` completes without errors
- `npx prisma db seed` creates admin + 3 programs
- `npm run build` passes
- All 9 tables created in PostgreSQL
- `@/*` import aliases work

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Prisma schema typo causes migration fail | Validate with `npx prisma validate` before migrating |
| shadcn/ui Tailwind v4 compatibility | Use latest shadcn init, verify CSS output |
| Seed script bcrypt version mismatch | Pin bcrypt version, test hashing |

## Security Considerations

- Never commit `.env.local` -- only `.env.example`
- Admin seed password (`changeme123`) must be changed on first login
- Password stored as bcrypt hash (12 rounds)
