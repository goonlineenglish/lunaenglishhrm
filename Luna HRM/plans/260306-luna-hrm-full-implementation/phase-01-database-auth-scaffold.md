# Phase 1: Database + Auth + App Scaffold

## Context Links

- [System Architecture](../../docs/system-architecture.md) — 16 table schemas, RLS policies
- [Code Standards](../../docs/code-standards.md) — File structure, naming conventions
- [Design Guidelines](../../docs/design-guidelines.md) — Luna brand colors, component patterns
- [Brainstorm V1](../reports/brainstorm-260305-hrm-lightweight-rebuild.md) — Architecture decisions

## Overview

- **Priority:** P0 (Critical path — blocks all phases)
- **Status:** Pending
- **Effort:** 2-3 days
- **Description:** Supabase Cloud project setup, 17-table SQL schema (16 data + attendance_locks), RLS policies for 4 roles using app_metadata, Next.js 16 scaffold with App Router, Supabase Auth (email/password), role-based dashboard layout.

## Key Insights

- Supabase Cloud free tier = 500MB, sufficient for 200+ employees over 5+ years
- Next.js 16 uses `await cookies()` pattern for server components (not synchronous)
- @supabase/ssr package handles cookie management for Next.js App Router
- Tailwind v4 uses CSS-first config (`@theme` in globals.css), NOT tailwind.config.ts
- shadcn/ui components installed via `npx shadcn@latest add` (CLI generates into components/ui/)
- **Auth identity link:** `employees.id` = `auth.users.id` (use same UUID). On user creation, Supabase Auth generates UUID → insert employee row with that same UUID as `id`.
- **Role/branch from app_metadata (NOT user_metadata):** Role + branch_id stored in `auth.users.app_metadata` (immutable by client) via admin API. RLS reads `auth.jwt()->'app_metadata'->>'role'` and `auth.jwt()->'app_metadata'->>'branch_id'`.
- **CRITICAL:** Never use `raw_user_meta_data` / `user_metadata` for authorization — it's client-writable.

## Requirements

### Functional
1. Supabase Cloud PostgreSQL with 17 tables, correct types, constraints, indexes
2. RLS policies enforcing 4 roles on all tables (using app_metadata, NOT user_metadata)
3. Next.js 16 app with App Router, (auth) and (dashboard) route groups
4. Login page (email/password), logout, session persistence
5. Role-based sidebar navigation (different menu items per role)
6. Dashboard home page per role
7. Branch CRUD (admin only)
8. Employee CRUD (admin + branch_manager for own branch)
9. Seed script with sample data (2 branches, 10+ employees, 5+ classes)

### Non-Functional
- Login < 1s response time
- TypeScript strict mode
- All pages server-rendered by default, client components only when needed
- Mobile-responsive layout (sidebar collapses on mobile)

## Architecture

### Supabase Auth Flow
```
Login form → supabase.auth.signInWithPassword()
         → JWT token stored in cookies (httpOnly, secure)
         → Server actions: createServerClient() reads cookies
         → Supabase RLS checks auth.uid() + role in JWT
         → Only authorized data returned
```

### Auth Identity & Role Mapping
```
employees.id = auth.users.id (same UUID, canonical link)
employees.role + branch_id → source of truth
auth.users.app_metadata.role → used in RLS policies (set via admin API, immutable by client)
auth.users.app_metadata.branch_id → used in RLS for branch scoping

On user creation (admin creates employee):
1. Create auth.users entry via Supabase Admin API → get UUID
2. Insert employees row with id = that UUID
3. Set role + branch_id in app_metadata (NOT user_metadata)
4. RLS policies reference: auth.jwt()->'app_metadata'->>'role'

On role change:
1. Update employees.role
2. Update auth.users.app_metadata via admin API (service role key)
```

### Route Structure
```
app/
├── layout.tsx              # Root layout (fonts, metadata)
├── page.tsx                # Redirect → /login or /dashboard
├── (auth)/
│   ├── layout.tsx          # Centered card layout
│   ├── login/page.tsx      # Email/password form
│   └── reset-password/page.tsx
├── (dashboard)/
│   ├── layout.tsx          # Sidebar + navbar layout
│   ├── page.tsx            # Dashboard home (stats per role)
│   ├── branches/page.tsx   # Admin: branch management
│   └── employees/
│       ├── page.tsx        # Employee list
│       └── [id]/page.tsx   # Employee detail
```

## Related Code Files

### Files to Create

**Root config:**
- `package.json` — Dependencies
- `tsconfig.json` — TypeScript config
- `next.config.ts` — Next.js config (port 3001)
- `.env.example` — Environment template
- `.env.local` — Supabase keys (gitignored)
- `.gitignore`

**Styles:**
- `app/globals.css` — Tailwind v4 CSS-first config with Luna theme colors

**Root app:**
- `app/layout.tsx` — Root layout
- `app/page.tsx` — Root redirect
- `app/error.tsx` — Global error boundary

**Auth routes:**
- `app/(auth)/layout.tsx` — Centered auth layout
- `app/(auth)/login/page.tsx` — Login page
- `app/(auth)/reset-password/page.tsx`

**Dashboard routes:**
- `app/(dashboard)/layout.tsx` — Sidebar layout with role-based nav
- `app/(dashboard)/page.tsx` — Dashboard home
- `app/(dashboard)/branches/page.tsx` — Branch management
- `app/(dashboard)/employees/page.tsx` — Employee list
- `app/(dashboard)/employees/[id]/page.tsx` — Employee detail

**Components:**
- `components/shared/sidebar.tsx` — Left sidebar navigation
- `components/shared/navbar.tsx` — Top navbar (user menu, branch selector)
- `components/shared/loading-spinner.tsx`
- `components/auth/login-form.tsx` — Email/password form
- `components/employees/employee-table.tsx` — Data table
- `components/employees/employee-form.tsx` — Create/edit dialog

**Libraries:**
- `lib/supabase/client.ts` — Browser Supabase client
- `lib/supabase/server.ts` — Server Supabase client (cookie-based)
- `lib/supabase/middleware.ts` — Session refresh middleware
- `lib/actions/auth-actions.ts` — Login, logout, reset password
- `lib/actions/branch-actions.ts` — Branch CRUD
- `lib/actions/employee-actions.ts` — Employee CRUD
- `lib/types/database.ts` — Generated Supabase types
- `lib/types/user.ts` — User/role types
- `lib/constants/navigation.ts` — Menu items per role (Vietnamese)
- `lib/constants/roles.ts` — Role definitions + permissions
- `lib/constants/messages.ts` — UI messages (Vietnamese)
- `lib/hooks/use-auth.ts` — Auth context hook
- `lib/hooks/use-supabase.ts` — Supabase client hook

**Database:**
- `supabase/migrations/001_create_all_tables.sql` — All 16 tables
- `supabase/migrations/002_rls_policies.sql` — RLS for all tables
- `supabase/migrations/003_indexes.sql` — Performance indexes
- `supabase/seed.ts` — Sample data script

**shadcn/ui components (installed via CLI):**
- `components/ui/button.tsx`
- `components/ui/input.tsx`
- `components/ui/label.tsx`
- `components/ui/table.tsx`
- `components/ui/dialog.tsx`
- `components/ui/select.tsx`
- `components/ui/alert.tsx`
- `components/ui/card.tsx`
- `components/ui/tabs.tsx`
- `components/ui/textarea.tsx`
- `components/ui/badge.tsx`
- `components/ui/sheet.tsx`
- `components/ui/separator.tsx`
- `components/ui/avatar.tsx`
- `components/ui/dropdown-menu.tsx`
- `components/ui/sidebar.tsx`

## Implementation Steps

### Step 1: Scaffold Next.js 16 App
1. `npx create-next-app@latest luna-hrm --typescript --tailwind --eslint --app --src-dir=false`
2. Configure `next.config.ts` — set port 3001, enable PWA headers
3. Install core deps: `@supabase/supabase-js @supabase/ssr`
4. Install shadcn/ui: `npx shadcn@latest init` (select CSS variables, default style)
5. Add all shadcn components listed above
6. Set up Tailwind v4 CSS-first config in `globals.css`:
   ```css
   @import "tailwindcss";
   @theme {
     --color-primary: #3E1A51;
     --color-secondary: #3FA5DC;
     --color-accent: #F59E0B;
   }
   ```

### Step 2: Configure Supabase Client
1. Create `.env.local` with NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
2. Create `lib/supabase/client.ts` — browser client using `createBrowserClient()`
3. Create `lib/supabase/server.ts` — server client using `createServerClient()` with `await cookies()`
4. Create `lib/supabase/middleware.ts` — session refresh in Next.js middleware
5. Create `middleware.ts` at root — protect (dashboard) routes, redirect unauthenticated to login

### Step 3: Create Database Schema
1. Run all 16 table CREATE statements in Supabase SQL Editor (or via migration)
2. Tables order (respecting FK dependencies):
   - `branches` (no FK — create WITHOUT manager_id FK first)
   - `employees` (FK → branches)
   - **ALTER TABLE `branches` ADD CONSTRAINT `fk_manager` FOREIGN KEY (`manager_id`) REFERENCES `employees`(`id`)** — staged circular FK
   - `class_schedules` (FK → branches, employees)
   - `attendance` (FK → class_schedules, employees)
   - `office_attendance` (FK → branches, employees)
   - `attendance_locks` — **NEW TABLE** for week lock persistence:
     ```
     attendance_locks (branch_id UUID, week_start DATE, locked_by UUID, locked_at TIMESTAMP)
     UNIQUE(branch_id, week_start)
     ```
   - `employee_weekly_notes` (FK → branches, employees)
   - `kpi_evaluations` (FK → employees, branches)
   - `payroll_periods` (FK → branches, employees)
   - `payslips` (FK → payroll_periods, employees, branches)
   - `salary_components` (FK → employees)
   - `evaluation_templates` (FK → employees)
   - `evaluation_criteria` (FK → evaluation_templates)
   - `evaluation_periods` (FK → employees)
   - `employee_evaluations` (FK → employees, evaluation_templates, evaluation_periods)
   - `evaluation_scores` (FK → employee_evaluations, evaluation_criteria)
   - `employee_notes` (FK → employees)
3. Use exact column types from system-architecture.md
4. Add all UNIQUE constraints and CHECK constraints:
   - `payslips`: UNIQUE `(payroll_period_id, employee_id)` — prevents duplicate payslips
   - `employees.email`: UNIQUE with `lower(email)` (case-insensitive)
   - `payroll_periods`: CHECK `month BETWEEN 1 AND 12`, CHECK `year BETWEEN 2020 AND 2100`
   - `kpi_evaluations`: CHECK `month BETWEEN 1 AND 12`, CHECK `year >= 2020`
   - `class_schedules`: CHECK `teacher_id <> assistant_id` (cannot be same person)
   - `class_schedules.days_of_week`: CHECK all values between 1 and 7
   - `employees.dependent_count`: CHECK `>= 0`
   - All status/role/position columns: CHECK constraints with exact allowed values
5. Add `updated_at` trigger function for auto-updating timestamps
6. **Attendance branch scoping:** `attendance` table does NOT have direct `branch_id`. RLS uses JOIN via `class_schedules.branch_id`. Add index on `attendance(schedule_id)` to support this join efficiently. Alternatively, for simpler RLS, consider adding a denormalized `branch_id` to `attendance` table.

### Step 4: Create RLS Policies
1. Enable RLS on all 16 tables
2. Create helper functions (use `app_metadata`, NOT `user_metadata`):
   ```sql
   CREATE FUNCTION get_user_role() RETURNS TEXT AS $$
     SELECT (auth.jwt()->'app_metadata'->>'role')::text;
   $$ LANGUAGE sql STABLE SECURITY DEFINER;

   CREATE FUNCTION get_user_branch_id() RETURNS UUID AS $$
     SELECT (auth.jwt()->'app_metadata'->>'branch_id')::uuid;
   $$ LANGUAGE sql STABLE SECURITY DEFINER;
   ```
3. Write policies per table per role per operation (SELECT/INSERT/UPDATE/DELETE)
4. Key patterns:
   - Admin: unrestricted access on all tables
   - Branch Manager: `WHERE branch_id = get_user_branch_id()` on direct tables; JOIN-based for `attendance` (via `class_schedules.branch_id`)
   - Accountant: SELECT all, CRUD on payroll tables only
   - Employee: `WHERE id = auth.uid()` on employees, `WHERE employee_id = auth.uid()` on owned data
5. Test each policy manually with different user sessions

### Step 5: Create Indexes
1. `(branch_id, date)` on attendance, office_attendance
2. `(employee_id, date)` on attendance, office_attendance
3. `(branch_id, status)` on class_schedules
4. `(employee_id, month, year)` on kpi_evaluations (+ unique)
5. `(payroll_period_id, employee_id)` on payslips
6. `(branch_id, week_start)` on employee_weekly_notes
7. `(branch_id, month, year)` on payroll_periods (+ unique)

### Step 6: Build Auth Flow
1. Create `app/(auth)/layout.tsx` — centered card layout
2. Create `components/auth/login-form.tsx` — email + password inputs, submit handler
3. Create `lib/actions/auth-actions.ts`:
   - `loginAction(email, password)` — sign in, verify employee record exists with matching id
   - `logoutAction()` — sign out, redirect to /login
   - `resetPasswordAction(email)` — send reset email
4. Employee creation flow (admin only via service role key):
   a. Create auth.users entry via Supabase Admin API → UUID returned
   b. Set `app_metadata: { role, branch_id }` via admin API
   c. Insert employee row with `id = auth_user_uuid`
5. Middleware: redirect unauthenticated users to /login, redirect authenticated from /login to /dashboard

### Step 7: Build Dashboard Layout
1. Create `app/(dashboard)/layout.tsx`:
   - Server component, reads user session via `await cookies()` + Supabase server client
   - Passes user role to Sidebar component
   - Responsive: sidebar collapsible on mobile
2. Create `components/shared/sidebar.tsx`:
   - Role-based menu items from `lib/constants/navigation.ts`
   - Admin: Ca Lam Viec, Cham Cong, Cham Cong VP, Tinh Luong, KPI, Nhan Vien, Co So, Audit Log
   - BM: Ca Lam Viec, Cham Cong, Cham Cong VP, KPI, Nhan Vien
   - Accountant: Tinh Luong, Nhan Vien (view)
   - Employee: Cham Cong, Phieu Luong, Ho So
3. Create `components/shared/navbar.tsx`:
   - Branch selector (admin/accountant sees all, BM sees own)
   - User avatar + dropdown (profile, logout)
4. Create `app/(dashboard)/page.tsx` — role-based stats cards

### Step 8: Branch & Employee CRUD
1. Create `lib/actions/branch-actions.ts` — createBranch, updateBranch, getBranches
2. Create `app/(dashboard)/branches/page.tsx` — branch list table + create form
3. Create `lib/actions/employee-actions.ts` — createEmployee, updateEmployee, getEmployees, getEmployeeById
4. Create `app/(dashboard)/employees/page.tsx` — employee data table with search/filter
5. Create `app/(dashboard)/employees/[id]/page.tsx` — employee detail view
6. Create `components/employees/employee-table.tsx` — shadcn Table
7. Create `components/employees/employee-form.tsx` — create/edit dialog with all basic fields

### Step 9: Seed Data
1. Create seed script that inserts:
   - 2 branches: "CS Tan Mai", "CS Quan 1"
   - Admin user + auth account
   - BM user per branch + auth accounts
   - Accountant user + auth account
   - 5 teachers (3 foreign + 2 Vietnamese)
   - 8 teaching assistants
   - 3 office staff
   - 5 class schedules per branch
2. Run via `npx tsx supabase/seed.ts` or Supabase SQL

### Step 10: Verify & Build
1. Run `npm run build` — fix all TypeScript errors
2. Test login with each role
3. Test RLS: BM cannot see other branch data
4. Test employee CRUD: admin creates, BM sees own branch only

## Todo List

- [ ] Scaffold Next.js 16 app with Tailwind v4 + shadcn/ui
- [ ] Configure Supabase clients (browser + server)
- [ ] Write 17-table migration SQL (16 data + attendance_locks)
- [ ] Write staged ALTER TABLE for branches.manager_id circular FK
- [ ] Write RLS policies for all tables using app_metadata helpers
- [ ] Create performance indexes
- [ ] Build login form + auth actions
- [ ] Build middleware (session refresh + route protection)
- [ ] Build dashboard layout (sidebar + navbar)
- [ ] Build role-based navigation
- [ ] Build branch CRUD page
- [ ] Build employee list + detail pages
- [ ] Create seed data script
- [ ] Test all 4 roles can login and see correct data
- [ ] `npm run build` passes

## Success Criteria

- All 17 tables created with correct types, constraints, indexes
- RLS policies enforced using app_metadata: BM cannot see other branch data
- Login/logout works for all 4 roles
- Dashboard shows role-appropriate navigation
- Branch CRUD works (admin only)
- Employee CRUD works (admin creates, BM manages own branch)
- TypeScript builds without errors
- Seed data loads successfully

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| RLS policy syntax errors | High | Test each policy individually with service role key |
| Supabase Auth metadata sync | Medium | Use trigger or post-login metadata update |
| Tailwind v4 breaking changes | Low | Follow CSS-first docs, no tailwind.config.ts |
| @supabase/ssr cookie handling | Medium | Use official Next.js integration guide |

## Security Considerations

- Service role key NEVER exposed to frontend (server-side only, in `.env.local`)
- `NEXT_PUBLIC_` prefix only on URL and anon key
- RLS enabled on ALL tables before any data insertion
- Password min length 8 chars enforced by Supabase Auth
- HTTPS enforced in production (Caddy reverse proxy)
- Audit logging planned for Phase 7

## Next Steps

After Phase 1 complete:
- Phase 2: Class Schedules + Attendance (builds on employee + branch data)
- Phase 6 can also start in parallel (only needs employees table)
