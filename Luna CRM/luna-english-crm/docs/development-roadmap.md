# Development Roadmap

## Phase 1: Project Setup & Database — COMPLETE
- [x] Next.js 16 project initialization
- [x] Tailwind CSS v4 + shadcn/ui setup
- [x] Supabase project creation
- [x] Database migrations 001-015 (8 core + 7 support tables)
- [x] Seed data (10 sample leads)

## Phase 2: Auth & Layout Shell — COMPLETE
- [x] Supabase Auth integration
- [x] Login page with email/password
- [x] Dashboard layout (sidebar, header)
- [x] Role-based navigation
- [x] User menu + logout

## Phase 3: Lead Pipeline (Kanban) — COMPLETE
- [x] Kanban board with @dnd-kit drag-drop
- [x] 8-stage Vietnamese pipeline
- [x] Lead cards with SLA timer
- [x] Quick-add lead sheet
- [x] Lead detail sheet (info, activities, reminders, Zalo)
- [x] Filter bar (stage, source, advisor, date)
- [x] Command search (Cmd+K)
- [x] List view toggle
- [x] Assign advisor select

## Phase 4: Follow-up Automation — COMPLETE
- [x] Reminder dashboard (today/upcoming/overdue)
- [x] Create reminder dialog
- [x] Auto-reminder on stage change (DB trigger)
- [x] Overdue detection cron (15min)
- [x] In-app notifications (bell + dropdown)
- [x] Realtime notification updates

## Phase 5: Student Management — COMPLETE
- [x] Student data table (@tanstack/react-table)
- [x] Student detail sheet
- [x] Status transitions (active/inactive/graduated)
- [x] CSV import (column mapping, preview, validation)
- [x] Auto-enrollment trigger at `da_dang_ky`
- [x] Create student dialog
- [x] Renewal countdown badge

## Phase 6: Dashboard & Reports — COMPLETE
- [x] KPI cards (total leads, conversion rate, etc.)
- [x] Pipeline funnel chart
- [x] Leads by source chart
- [x] Monthly trend chart
- [x] Advisor performance table
- [x] Date range filter
- [x] Dashboard views in database

## Phase 7: Integrations — COMPLETE
- [x] Zalo OA client + webhook handler
- [x] Facebook Graph API client + webhook handler
- [x] Message queue with retry processor (exponential backoff)
- [x] Integration settings page
- [x] Zalo/Facebook connection cards
- [x] Webhook events table
- [x] OAuth token refresh cron

## Phase 8: Deployment & Security Hardening — COMPLETE
- [x] Supabase Cloud deployment (Singapore)
- [x] Database migrations deployed
- [x] GitHub repository setup (`goonlineenglish/luna-english-crm`)
- [x] vercel.json with all 4 cron schedules configured
- [x] .env.local.example with required env vars
- [x] Cron auth fail-closed (all 4 routes deny without CRON_SECRET)
- [x] Zalo webhook race condition fix (event update by ID)
- [x] Message queue retry status correction (pending vs failed)
- [x] searchLeads input sanitization (escape %, \, _)
- [x] Vietnamese encoding (proper diacritics in all strings)

## Phase 9: Testing & Hardening — COMPLETE
- [x] Error boundaries (global + dashboard)
- [x] 404 not-found page
- [x] Loading states audit (all 5 routes have skeleton loading.tsx)
- [x] SEO metadata on all 6 pages (pipeline, reminders, students, reports, settings, login)
- [x] Security review + fixes (middleware, webhooks, cron, RLS, input validation)
- [x] Code review completed + all issues resolved
- [x] Smoke test completed (all routes verified)

## Phase 10: Enhanced Activities & Communication — COMPLETE
- [x] DB migrations 016-021 (stage notes, scheduling, templates, RLS, triggers)
- [x] Stage notes UI (note/result/next_steps per stage with history)
- [x] Scheduled activity management (create, update status, global /activities view)
- [x] Smart stage next-steps checklists (auto-creation on stage change, configurable)
- [x] Stale lead detection (find_stale_leads RPC + cron integration)
- [x] Email communication via Resend (template-based, preview, send from lead detail)
- [x] Zalo OA messaging (template-based, send from lead detail, follower-based gating)
- [x] Trial class Zalo auto-reminder (24h before, via cron)
- [x] Stage config settings UI (admin)
- [x] New activity types: scheduled_call, trial_class, consultation, checklist

## Phase 11: Google Sheets Sync — COMPLETE
- [x] Google Sheets API integration (googleapis v4)
- [x] One-way Supabase → Sheets data sync
- [x] 5-tab spreadsheet: Leads, Học viên, Hoạt động, Nhắc nhở, Tổng quan
- [x] google-sheets-sync.ts module (tab creation, formatting, batch updates)
- [x] Sync cron endpoint (15min schedule)
- [x] Environment variables (GOOGLE_SERVICE_ACCOUNT_KEY, GOOGLE_SHEET_ID)
- [x] Updated vercel.json with 5th cron

## Phase 12: Student Data Hub Phase 1 — COMPLETE
- [x] DB migration 034 (gap-fill for 029-033)
- [x] Add `google_sheet` to `lead_source` enum
- [x] Enforce `student_code` NOT NULL with backfill
- [x] Create `sync_runs` table with UNIQUE partial index for concurrency guard
- [x] Migrate legacy `secondary` → `secondary_basic`
- [x] 9 new database tables (attendance_records, teacher_comments, student_scores, homework_records, learning_paths, learning_milestones, sheet_sync_snapshots, sync_runs, + 1 cascade delete tracking)
- [x] Types module: student-hub-types.ts (AttendanceRecord, TeacherComment, StudentScore, LearningPath interfaces)
- [x] Constants module: student-hub-constants.ts (PAYMENT_STATUS, PROGRAM_CONFIGS with 6 programs, ATTENDANCE_STATUS)
- [x] Split student-actions.ts (398 lines) into 4 focused modules + barrel export
- [x] 2-way Google Sheet sync (Sheets API inbound + outbound)
- [x] Auto-create leads from Sheet (source='google_sheet', stage='da_dang_ky')
- [x] Concurrency guard via sync_runs UNIQUE partial index (serverless-compatible)
- [x] Enhanced student profile UI (7 new fields: DOB, gender, address, teacher, tuition, payment status, program)
- [x] Student table: 3 new columns (Chương trình, GV phụ trách, Thanh toán)
- [x] 4 new student detail tabs: Hồ sơ | Lộ trình học | Điểm danh | Điểm số
- [x] npm run build ✓ clean, npm run lint ✓ clean, npm test ✓ 6/6 passing
- [ ] Deploy to Vercel (connect GitHub, set env vars, verify cron)
- [ ] Configure custom domain (if applicable)
- [ ] (Optional) Middleware → proxy migration (Next.js 16 deprecation warning)
- [ ] (Optional) Admin UI for email/Zalo template management (currently SQL-only)
- [ ] (Optional) Rate limiting on webhook endpoints
- [ ] (Optional) Role-based authorization in server actions (currently relies on RLS only)
