# Luna HRM

Hệ thống quản lý nhân sự nhẹ cho Trung tâm Tiếng Anh. Thay thế Frappe HRMS (quá nặng cho Dell i3/8GB).

## Tech Stack

- **Frontend:** Next.js 16 + App Router + shadcn/ui + Tailwind v4
- **Auth:** Supabase Auth + RLS (68 policies)
- **Database:** Supabase Cloud PostgreSQL
- **Mobile:** PWA (service worker + manifest)
- **Port:** 3000 (dev) / 3001 (production)

## Quick Start

```bash
# Install
npm install

# Dev server (port 3000)
npm run dev

# Build
npm run build

# Production (port 3001)
npm start -- -p 3001

# Tests (101 tests, 4 suites)
npm test

# Lint
npm run lint
```

## Supabase Setup

1. Tạo Supabase project → copy API keys
2. Copy `.env.example` → `.env.local`, điền keys
3. Chạy migrations trong `supabase/migrations/` (thứ tự 000→005)
4. Tạo auth users → chạy `supabase/seed.sql` (tùy chọn)

## Test Accounts (Dev)

Sau khi seed, tạo auth users với password `Luna@2026`:

| Role | Email | Branch |
|------|-------|--------|
| admin | `admin@luna-hrm.local` | CS Tân Mai |
| branch_manager | `bm.tanmai@luna-hrm.local` | CS Tân Mai |
| branch_manager | `bm.quan1@luna-hrm.local` | CS Quận 1 |
| accountant | `accountant@luna-hrm.local` | CS Tân Mai |
| teacher | `john.smith@luna-hrm.local` | CS Tân Mai |
| assistant | `tran.linh@luna-hrm.local` | CS Tân Mai |

> Auth users phải tạo qua Supabase Dashboard hoặc Admin API trước, set `app_metadata` (role + branch_id), rồi chạy seed.sql.

## Routes (24)

- `/login`, `/reset-password` — Auth
- `/dashboard` — Overview
- `/branches` — Quản lý chi nhánh
- `/class-schedules` — Ca làm việc
- `/attendance` — Chấm công (weekly grid)
- `/office-attendance` — Chấm công VP
- `/employees`, `/employees/[id]` — Nhân viên
- `/employees/[id]/evaluate` — Đánh giá NV
- `/evaluation-templates`, `/evaluation-periods` — Mẫu đánh giá
- `/payroll`, `/payroll/[period]` — Tính lương
- `/kpi`, `/kpi/[employee]` — KPI trợ giảng
- `/my-attendance`, `/my-payslips`, `/my-profile` — Employee portal

## Documentation

Xem `docs/` cho chi tiết:
- `deployment-guide.md` — Hướng dẫn deploy production
- `system-architecture.md` — Kiến trúc hệ thống
- `code-standards.md` — Coding conventions
- `codebase-summary.md` — Tổng quan codebase
- `project-roadmap.md` — Tiến độ dự án
- `project-overview-pdr.md` — PDR tổng quan

## Status

**MVP Complete** — 24 routes, 0 build errors, 101 unit tests passing, production-reviewed.
