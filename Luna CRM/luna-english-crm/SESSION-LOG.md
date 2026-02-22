# Luna English CRM — Session Log

> File này ghi lại toàn bộ tiến trình làm việc qua các phiên.
> Mở file này khi bắt đầu phiên mới để biết đang ở đâu và cần làm gì tiếp.

---

## Phiên 1 — Khởi tạo dự án

**Commit**: `778ec0d` — `feat: initial project setup with CRM brainstorm and implementation plan`

- Brainstorm yêu cầu CRM cho Luna English (Tân Mai)
- Lên kế hoạch triển khai 7 phase
- Chọn stack: Next.js + Supabase + shadcn/ui + Tailwind v4

---

## Phiên 2 — Full-stack implementation

**Commit**: `b69942f` — `feat: implement Luna English CRM full-stack application`

### Đã hoàn thành:
- **Database**: 15 SQL migrations (users, leads, activities, reminders, students, notifications, integrations, RLS, views)
- **Auth**: Login page, Supabase auth, role-based access (admin/advisor/marketing)
- **Layout**: Sidebar (desktop + mobile), header, user menu, notification bell
- **Pipeline**: Kanban board (drag-drop @dnd-kit), list view, filters, lead detail sheet, quick add, command search
- **Reminders**: Follow-up automation, cron job check overdue
- **Students**: Data table, CSV import, status tracking
- **Dashboard**: KPI cards, charts (Recharts), advisor performance
- **Integrations**: Zalo OA + Facebook webhooks, message queue processor
- **Seed data**: 10 sample leads

---

## Phiên 3 — Bug fixes & serialization

**Commit**: `be5caea` — `fix: resolve server-to-client component serialization and add missing routes`

### Bugs đã fix:
- **Nav icon serialization**: Lucide components không serialize được từ Server → Client Component → đổi sang string `iconName` + `ICON_MAP` resolve trong client
- **Missing /leads route**: Thêm redirect `/leads` → `/pipeline`
- **Windows NUL file crash**: Turbopack crash trên Windows do file tên `NUL` (reserved device name) → xóa bằng Python Win32 API

---

## Phiên 4 — Supabase Cloud + CLAUDE.md

**Commit**: `ed61eb9` — `docs: add CLAUDE.md with full project context for session continuity`

### Đã hoàn thành:
- **Supabase Cloud**: Deploy database lên `vgxpucmwivhlgvlzzkju.supabase.co` (Singapore)
- Chạy 15 migrations + seed data qua SQL Editor
- Tạo admin user qua Supabase Dashboard
- `.env.local` với Supabase URL + anon key
- **GitHub**: Push lên `goonlineenglish/luna-english-crm` (main branch)
- **Local demo**: Verify login + pipeline hoạt động trên localhost:3000
- **CLAUDE.md**: Tạo file context đầy đủ cho các phiên sau

---

## Phiên 5 — Lint fixes + ClaudeKit + Vercel prep (phiên hiện tại)

**Commit**: `9061a5f` — `fix: resolve all ESLint errors and warnings for React 19 Compiler compatibility`

**Ngày**: Session hiện tại

### 1. Cài đặt ClaudeKit Engineer
- `npm install -g claudekit-cli` (v3.34.4)
- `ck init -g --kit engineer --yes` → Global config tại `~/.claude/` (v2.11.3, 1132 files)
- `ck init --kit engineer --yes` → Project config tại `.claude/` (2034 files)

### 2. Fix toàn bộ ESLint errors (4 errors → 0 errors)

| File | Lỗi | Cách fix |
|------|------|----------|
| `components/pipeline/lead-card-sla-timer.tsx` | `Date.now()` impure trong `useMemo` | Tách `computeSla()` ra ngoài, dùng tick-based re-render (useState + setInterval mỗi 60s) |
| `components/pipeline/lead-detail-activities.tsx` | `loadActivities` dùng trước khai báo + missing dep | Chuyển sang `useCallback` + eslint-disable cho fetch-on-mount |
| `components/settings/integration-settings.tsx` | `loadEvents` dùng trước khai báo | Chuyển sang `useCallback` + eslint-disable cho fetch-on-mount |
| `lib/hooks/use-realtime-notifications.ts` | `fetchNotifications()` setState trong useEffect | eslint-disable cho fetch-on-mount (đã dùng useCallback đúng) |

### 3. Fix toàn bộ ESLint warnings (5 warnings → 1 warning)

| File | Warning | Cách fix |
|------|---------|----------|
| `components/pipeline/lead-card.tsx` | Unused `SOURCE_LABELS` | Xóa object |
| `components/pipeline/pipeline-view.tsx` | Unused `userId` | Bỏ khỏi destructuring |
| `components/students/student-data-table.tsx` | Unused `StudentStatus` import | Xóa import |
| `components/students/student-data-table.tsx` | TanStack Table incompatible-library | **Không fix được** — warning của thư viện, React Compiler skip memoization |
| `components/pipeline/lead-detail-activities.tsx` | Missing dep `loadActivities` | Fix cùng lúc với error ở trên |

### 4. Files mới thêm
- `app/error.tsx` — Global error boundary
- `app/(dashboard)/error.tsx` — Dashboard error boundary
- `app/not-found.tsx` — 404 page
- `vercel.json` — Vercel deployment config (cron jobs)
- `.env.local.example` — Template env vars

### 5. Kết quả lint cuối cùng
```
✖ 1 problem (0 errors, 1 warning)
  - warning: TanStack Table incompatible-library (không fix được, safe to ignore)
```

---

## Trạng thái hiện tại

### Git
- **Branch**: `main`
- **Latest commit**: `9061a5f` — pushed to GitHub
- **Working tree**: Clean (chỉ còn untracked files không cần commit)
- **GitHub**: `goonlineenglish/luna-english-crm`

### Untracked files (không commit)
```
../.opencode/          # ClaudeKit config (parent dir)
../.repomixignore      # ClaudeKit config
../AGENTS.md           # ClaudeKit config
../CLAUDE.md           # ClaudeKit config (parent dir)
../NUL                 # Windows artifact (cần xóa)
chat sesson 20.02.26.txt  # Chat log cũ
docs/                  # Engineering docs (chưa commit)
supabase/.temp/        # Supabase temp files
../plans/templates/    # ClaudeKit templates
../release-manifest.json  # ClaudeKit manifest
```

### Lint status: PASS (0 errors, 1 unavoidable warning)

### App status
- **Local dev**: `npm run dev` → http://localhost:3000 ✅
- **Supabase Cloud**: Database deployed ✅
- **Vercel**: Chưa deploy

---

## Việc cần làm tiếp (theo thứ tự ưu tiên)

### Ưu tiên cao
1. **Deploy lên Vercel**
   - Connect GitHub repo `goonlineenglish/luna-english-crm`
   - Set env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Verify build pass (`npm run build`)
   - Test production URL

2. **Test các route chưa test**
   - `/reminders` — Follow-up reminders
   - `/students` — Student management
   - `/reports` — Dashboard reports
   - `/settings` — Admin settings (integrations)

### Ưu tiên trung bình
3. **Fix middleware deprecation** — Next.js 16 khuyến nghị dùng "proxy" thay "middleware"
4. **Commit thư mục `docs/`** — 8 file engineering docs chưa được commit
5. **Xóa file `NUL`** ở parent directory (Windows artifact)

### Ưu tiên thấp
6. **Production hardening** — Loading states, SEO meta tags
7. **Cron jobs** — Test check-overdue-reminders, process-message-queue, refresh-tokens trên Vercel
8. **Integrations** — Cấu hình Zalo OA + Facebook app thật (cần credentials)

---

## Quick Start cho phiên mới

```bash
# 1. Mở project
cd "F:/APP Antigravity/Tool/Luna CRM/luna-english-crm"

# 2. Kill process cũ (nếu có)
taskkill /f /im node.exe

# 3. Clean build cache
rm -rf .next

# 4. Start dev server
npm run dev

# 5. Mở browser
# http://localhost:3000
```

## Tech Notes

### React 19 Compiler Lint Rules (quan trọng)
- `react-hooks/set-state-in-effect`: Không cho gọi setState trực tiếp trong useEffect. Fetch-on-mount pattern cần `eslint-disable` comment vì đây là pattern hợp lệ.
- `react-hooks/refs`: Không cho update ref.current trong render. Dùng `useEffect` để sync ref.
- `react-hooks/incompatible-library`: TanStack Table không tương thích React Compiler memoization — safe to ignore.

### Supabase Server vs Client
- **Server**: `createClient()` từ `lib/supabase/server.ts` — dùng `cookies()` (async)
- **Client**: `createClient()` từ `lib/supabase/client.ts` — dùng `createBrowserClient()`
- **QUAN TRỌNG**: Server side luôn dùng `getUser()`, KHÔNG dùng `getSession()`

### Windows Dev Environment
- Luôn kill node process trước khi restart: `taskkill /f /im node.exe`
- Luôn xóa `.next` cache: `rm -rf .next`
- Cẩn thận file `NUL` — Windows reserved device name, Turbopack crash
