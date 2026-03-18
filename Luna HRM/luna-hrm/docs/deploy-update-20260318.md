# 🚀 Luna HRM — Hướng Dẫn Deploy Tính Năng Mới (2026-03-18)

**Dành cho:** Antigravity team
**Server:** Ubuntu (cuongpham) — PM2 `luna-hrm`, Port `3002`, Cloudflare Tunnel
**Domain:** `https://hrm.lunaenglish.io.vn`

---

## Tóm Tắt Tính Năng Mới

| # | Tính năng | Migration |
|---|-----------|-----------|
| 1 | KPI Score Scale Update (5 tiêu chí thang mới) | `013_kpi_score_scale_update.sql` |
| 2 | Multi-Role RBAC (`roles[]` array thay `role` string) | `014_multi_role_schema_and_rls.sql` |
| 3 | Email Confirmation Workflow cho payslips | `015_employee_payslip_confirmation.sql` |
| 4 | Employee Combobox UX (tìm nhân viên nhanh) | — (UI only) |
| 5 | Fix: Sunday office attendance (nhập manual) | — (Logic fix) |

---

## ⚠️ Trước Khi Bắt Đầu

> **QUAN TRỌNG:** Migration 014 thay đổi toàn bộ RLS policies (70 policies) và thêm cột `roles TEXT[]` vào bảng `employees`. **Bắt buộc chạy migrations trước khi deploy code mới.**

1. **Backup** (khuyến nghị): Vào Supabase Dashboard → `Database` → `Backups` → tạo backup thủ công.
2. Kiểm tra app đang chạy: `pm2 status` → phải thấy `luna-hrm` **online**.
3. Kiểm tra không có user đang dùng (nên deploy ngoài giờ).

---

## Bước 1: SSH vào Server

```bash
ssh cuongpham@<server-ip>
```

---

## Bước 2: Chạy Database Migrations (Supabase Dashboard)

> Migrations phải chạy **TRƯỚC** khi pull code mới để tránh lỗi runtime.

Vào [Supabase Dashboard](https://supabase.com/dashboard/project/btwwqeemwedtbnskjcem) → **SQL Editor** → **New Query**

### 2.1 Migration 013 — KPI Score Scale Update

Copy toàn bộ nội dung file `supabase/migrations/013_kpi_score_scale_update.sql`, paste vào SQL Editor → **Run**.

**Kết quả mong đợi:** `Success. No rows returned`

**Nội dung migration làm gì:**
- Cập nhật thang điểm KPI 5 tiêu chí: `tsi/10`, `funtime/30`, `parent/20`, `student/30`, `demeanor/10` (tổng 100)
- Thêm 3 cột tracking buổi dạy: `sessions_worked`, `substitute_sessions`, `total_scheduled_sessions`

### 2.2 Migration 014 — Multi-Role RBAC

Copy toàn bộ nội dung file `supabase/migrations/014_multi_role_schema_and_rls.sql`, paste vào SQL Editor → **Run**.

> ⚠️ File này **dài (~740 dòng)**. Migration sẽ DROP và tạo lại toàn bộ 70 RLS policies — bình thường, đừng lo.

**Kết quả mong đợi:** `Success. No rows returned`

**Nội dung migration làm gì:**
- Thêm cột `employees.roles TEXT[]` (mảng roles)
- Backfill tự động: mỗi employee có `roles = [role_cũ]`
- Tạo 4 hàm helper mới: `get_user_roles()`, `user_has_role()`, `is_global_access()`, `get_current_user_roles()`
- Viết lại 70 RLS policies sang pattern `user_has_role('X')` — hỗ trợ multi-role
- Backward compat: `get_user_role()` vẫn hoạt động (trả về role đầu tiên)

### 2.3 Migration 015 — Email Confirmation Workflow

Copy toàn bộ nội dung file `supabase/migrations/015_employee_payslip_confirmation.sql`, paste vào SQL Editor → **Run**.

**Kết quả mong đợi:** `Success. No rows returned`

**Nội dung migration làm gì:**
- Thêm 6 cột vào `payslips`: `employee_status`, `employee_confirmed_at`, `employee_feedback`, `confirmation_token` (UNIQUE), `dispute_count`, `reminder_sent_at`
- Thêm `confirmation_deadline` vào `payroll_periods`
- Mở rộng constraint `status` của `payroll_periods` thêm giá trị `'finalized'`
- Tạo 2 indexes cho token lookup và cron

### 2.4 Xác minh migrations thành công

Trong SQL Editor, chạy query kiểm tra:

```sql
-- Kiểm tra cột roles[] đã có chưa
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'employees' AND column_name = 'roles';

-- Kiểm tra cột confirmation_token đã có chưa
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'payslips' AND column_name IN ('employee_status', 'confirmation_token');

-- Kiểm tra backfill roles[] đúng chưa (phải = 0)
SELECT COUNT(*) FROM employees WHERE roles = '{}';
```

Kết quả đúng:
- Query 1: trả về 1 row `roles | ARRAY`
- Query 2: trả về 2 rows
- Query 3: trả về `0` (mọi employee đều có roles)

---

## Bước 3: Cập nhật file .env.local (nếu cần)

Tính năng Email Confirmation cần thêm biến `RESEND_API_KEY` nếu muốn gửi email thật:

```bash
nano /opt/luna-hrm/.env.local
# hoặc vị trí thực tế trên server của bạn
```

Thêm dòng:

```bash
# Resend Email API (cho email confirmation workflow)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> Lấy API key tại [resend.com](https://resend.com) → API Keys. Nếu chưa cần gửi email thật, có thể để trống tạm — app vẫn chạy bình thường.

---

## Bước 4: Pull Code Mới + Build

```bash
# Di chuyển đến thư mục app
cd /opt/luna-hrm
# (hoặc thư mục thực tế server đang dùng)

# Kiểm tra thư mục đúng chưa
pwd && ls

# Pull code mới từ Git
git pull origin main

# Xem tóm tắt các thay đổi
git log --oneline -10

# Cài dependencies (nếu có thay đổi package.json)
npm install

# Build production
npm run build
```

**Kết quả build mong đợi:**
```
✓ Generating static pages (25/25)
Route (app): 25 routes
0 errors
```

> Nếu có lỗi build, **KHÔNG restart app** — giữ nguyên bản cũ đang chạy, báo lại dev team.

---

## Bước 5: Restart App

```bash
# Zero-downtime reload (khuyến nghị)
pm2 reload luna-hrm

# Kiểm tra status
pm2 status

# Xem logs 30 giây đầu
pm2 logs luna-hrm --lines 30
```

**PM2 status mong đợi:**

```
┌────┬──────────┬─────────┬─────────┬────────┬───────────┐
│ id │ name     │ status  │ restart │ uptime │ mem       │
├────┼──────────┼─────────┼─────────┼────────┼───────────┤
│ 3  │ luna-hrm │ online  │ 0       │ 0s     │ ~70-80mb  │
└────┴──────────┴─────────┴─────────┴────────┴───────────┘
```

---

## Bước 6: Cập nhật Crontab (Email Cron Jobs Mới)

Tính năng Email Confirmation có 2 cron endpoint mới:

```bash
crontab -e
```

Thêm vào cuối file (bên dưới các cron hiện có):

```cron
# Luna HRM — Email Confirmation Cron Jobs (thêm 2026-03-18)
# Auto-confirm payslips sau deadline (chạy hàng ngày 9:00 AM)
0 9 * * * curl -s -H "x-cron-secret: YOUR_CRON_SECRET" https://hrm.lunaenglish.io.vn/api/cron/auto-confirm-payslips > /dev/null 2>&1

# Nhắc nhân viên chưa confirm (chạy hàng ngày 9:00 AM)
0 9 * * * curl -s -H "x-cron-secret: YOUR_CRON_SECRET" https://hrm.lunaenglish.io.vn/api/cron/payslip-reminder > /dev/null 2>&1
```

> Thay `YOUR_CRON_SECRET` bằng giá trị `CRON_SECRET` trong file `.env.local` trên server.

Verify:
```bash
crontab -l
```

---

## Bước 7: Checklist Xác Nhận Sau Deploy

Mở browser vào `https://hrm.lunaenglish.io.vn` và kiểm tra:

### ✅ Core Features (phải pass hết)

- [ ] Trang đăng nhập load OK, không lỗi JS console
- [ ] Đăng nhập admin thành công → vào `/dashboard`
- [ ] Vào `/employees` — danh sách nhân viên hiện bình thường
- [ ] Click vào 1 nhân viên → trang profile hiển thị **role badges** (mới)
- [ ] Vào `/payroll` — danh sách kỳ lương hiển thị OK
- [ ] `pm2 status` → `luna-hrm` vẫn **online**

### ✅ Tính Năng Mới (verify nhanh)

- [ ] **Multi-Role RBAC:** Vào employee profile → thấy section "Vai trò" với badges
- [ ] **Admin role assignment:** Admin vào employee → button "Phân quyền" (nếu có)
- [ ] **KPI:** Vào `/kpi` → form chấm KPI hiển thị thang điểm mới (tổng 100)
- [ ] **Employee Combobox:** Vào `/class-schedules` tạo/edit lớp → ô tìm giáo viên có combobox search
- [ ] **Payslip status:** Vào 1 payslip → thấy status `pending_send` (cột mới)

### ✅ Server Health

```bash
# Kiểm tra PM2
pm2 status

# Kiểm tra logs không có lỗi crash
pm2 logs luna-hrm --lines 20

# Kiểm tra RAM (bình thường ~70-100MB)
pm2 show luna-hrm | grep memory
```

---

## Rollback (Nếu Cần)

Nếu build lỗi hoặc app crash sau deploy:

```bash
# Option 1: Rollback về commit trước
cd /opt/luna-hrm
git log --oneline -5          # Tìm commit hash trước đó
git checkout <commit-hash>
npm run build
pm2 reload luna-hrm
```

> **Lưu ý migrations:** Migrations 013, 014, 015 đã chạy trên Supabase **không thể rollback tự động**. Nếu cần rollback hoàn toàn, phải restore từ Supabase backup (xem phần "Trước Khi Bắt Đầu").

---

## Troubleshoot Nhanh

| Lỗi | Nguyên nhân | Fix |
|-----|-------------|-----|
| App crash ngay sau reload | Build lỗi hoặc `.env.local` thiếu key | Kiểm tra `pm2 logs luna-hrm` |
| Trang trắng, lỗi "roles is not defined" | Migration 014 chưa chạy | Chạy lại migration 014 |
| RLS error "new row violates policy" | `app_metadata.roles[]` chưa sync | Xem phần 2.4 verify migrations |
| Email không gửi được | Thiếu `RESEND_API_KEY` | Thêm vào `.env.local`, `pm2 reload` |
| Build fail "Cannot find module" | `npm install` chưa chạy sau pull | Chạy `npm install` rồi build lại |

---

*Tài liệu này do Antigravity team sử dụng nội bộ — Cập nhật: 2026-03-18*
