# Luna HRM — Hướng Dẫn Deploy Production

**Dành cho:** Antigravity team
**Cập nhật:** 2026-03-15
**Trạng thái:** Production-ready (xhigh review passed, 130+ tests, 0 build errors)

---

## Tổng Quan

| Thành phần | Công nghệ | Ghi chú |
|-----------|-----------|---------|
| Frontend + Backend | Next.js 16.1.6 (App Router) | 24 routes, SSR |
| UI | shadcn/ui + Tailwind v4 | CSS-responsive, PWA |
| Database | Supabase Cloud PostgreSQL | Free tier 500MB |
| Auth | Supabase Auth + RLS | JWT với app_metadata |
| Hosting | Dell Ubuntu server | Port 3001 |
| Process Manager | PM2 | Tự restart khi crash |
| Reverse Proxy | Caddy hoặc Nginx | HTTPS + domain |

---

## Bước 1: Tạo Supabase Project

### 1.1 Tạo project mới

1. Truy cập [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Chọn **Free tier** (500MB PostgreSQL, 50k monthly active users)
4. Đặt tên: `luna-hrm`
5. Chọn region: **Southeast Asia (Singapore)** — gần VN nhất
6. Đặt database password (lưu lại, không dùng cho app)
7. Đợi project khởi tạo (~2 phút)

### 1.2 Lấy API keys

Vào **Project Settings → API**, copy 3 giá trị:

| Key | Vị trí | Mục đích |
|-----|--------|----------|
| `Project URL` | Settings → API | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon public` | Settings → API → Project API keys | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` | Settings → API → Project API keys | `SUPABASE_SERVICE_ROLE_KEY` |

> **QUAN TRỌNG:** `service_role` key có quyền bypass RLS. KHÔNG BAO GIỜ expose ra client-side.

---

## Bước 2: Chạy Database Migrations

### 2.1 Mở SQL Editor

Vào Supabase Dashboard → **SQL Editor** → **New Query**

### 2.2 Chạy migrations theo thứ tự

Chạy từng file SQL theo đúng thứ tự dưới đây. Copy nội dung từ thư mục `supabase/migrations/` paste vào SQL Editor rồi **Run**.

| Thứ tự | File | Nội dung | Dòng |
|--------|------|----------|------|
| 1 | `001_create_all_tables.sql` | 17 bảng + constraints + functions | 407 |
| 2 | `002_rls_policies.sql` | 68 RLS policies cho 4 roles | 579 |
| 3 | `003_indexes.sql` | Performance indexes cho query | 116 |
| 4 | `004_add_payslip_deductions_column.sql` | Thêm cột deductions cho payslips | 7 |
| 5 | `005_audit_logs.sql` | Bảng audit_logs + RLS | 24 |
| 6 | `006_fix_table_permissions.sql` | Sửa table permissions | 15 |
| 7 | `007_payslip_audit_logs.sql` | Audit logs cho payslip edits (Semi-Manual Payroll) | 18 |
| 8 | `008_attendance_lock_override.sql` | Lock override + multi-row lock (Calendar Dates) | 22 |
| 9 | `009_payroll_class_breakdown.sql` | Per-class rates + class_breakdown (Payroll Per-Class) | 30 |
| 10 | `010_security_and_index_improvements.sql` | Security & index improvements | 25 |
| 11 | `011_fix_rls_recursion.sql` | RLS recursion fix (SECURITY DEFINER) | 20 |
| **12** | **`012_employee_payslip_confirmation.sql`** | **Email confirmation workflow (Phase 6)** | **~35** |

**Kiểm tra sau mỗi migration:** nếu thấy `Success. No rows returned` là OK.

### 2.3 Xác minh database

Sau khi chạy xong tất cả migrations, vào **Table Editor** kiểm tra có đủ các bảng:

```
branches, employees, class_schedules, attendance,
office_attendance, attendance_locks, employee_weekly_notes,
kpi_evaluations, payroll_periods, payslips, salary_components,
evaluation_templates, evaluation_criteria, evaluation_periods,
employee_evaluations, evaluation_scores, employee_notes, audit_logs
```

Tổng: **18 bảng** (17 data + 1 audit).

---

## Bước 3: Tạo Admin User Đầu Tiên

### 3.1 Tạo auth user qua Supabase Dashboard

1. Vào **Authentication → Users → Add User**
2. Nhập:
   - Email: `admin@lunaenglish.vn` (hoặc email admin thực tế)
   - Password: mật khẩu mạnh (8+ ký tự, có chữ hoa + số + ký tự đặc biệt)
   - Check **Auto Confirm User**
3. Click **Create User**
4. Copy **User UID** (UUID) — cần cho bước tiếp theo

### 3.2 Set app_metadata (role + branch)

Vào **SQL Editor**, chạy:

```sql
-- Thay <USER_UUID> bằng UUID vừa copy
-- Thay <BRANCH_ID> bằng UUID branch (tạo ở bước 3.3)
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{role}', '"admin"'
)
WHERE id = '<USER_UUID>';
```

### 3.3 Tạo branch + employee record

```sql
-- 1. Tạo branch đầu tiên
INSERT INTO branches (id, name, address, is_active)
VALUES (
  gen_random_uuid(),
  'Chi nhánh Tân Mai',
  '123 Tân Mai, Hoàng Mai, Hà Nội',
  true
);

-- Lấy branch_id vừa tạo
-- SELECT id FROM branches WHERE name = 'Chi nhánh Tân Mai';

-- 2. Tạo employee record cho admin (ID = auth user ID)
INSERT INTO employees (id, branch_id, full_name, employee_code, position, email, role, is_active)
VALUES (
  '<USER_UUID>',           -- CÙNG UUID với auth user
  '<BRANCH_UUID>',         -- UUID branch vừa tạo
  'Admin Luna',
  'ADM001',
  'admin',
  'admin@lunaenglish.vn',
  'admin',
  true
);

-- 3. Update app_metadata với branch_id
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('branch_id', '<BRANCH_UUID>')
WHERE id = '<USER_UUID>';
```

### 3.4 Seed Data (Tùy Chọn — Cho Dev/Test)

Nếu muốn dữ liệu mẫu (21 nhân viên, 10 lớp học, etc.), tạo auth users trước rồi chạy seed:

1. Tạo auth users qua Dashboard (Authentication → Users → Add User) hoặc Admin API
2. Set `app_metadata` cho mỗi user (role + branch_id) qua SQL Editor
3. Chạy `supabase/seed.sql` trong SQL Editor

**Test accounts (seed data):**

| Role | Email | Password | Branch |
|------|-------|----------|--------|
| admin | `admin@luna-hrm.local` | `Luna@2026` | CS Tân Mai |
| branch_manager | `bm.tanmai@luna-hrm.local` | `Luna@2026` | CS Tân Mai |
| branch_manager | `bm.quan1@luna-hrm.local` | `Luna@2026` | CS Quận 1 |
| accountant | `accountant@luna-hrm.local` | `Luna@2026` | CS Tân Mai |
| employee (teacher) | `john.smith@luna-hrm.local` | `Luna@2026` | CS Tân Mai |
| employee (assistant) | `tran.linh@luna-hrm.local` | `Luna@2026` | CS Tân Mai |

> **Lưu ý:** Password `Luna@2026` chỉ dùng cho dev/test. Production phải đổi password mạnh.

### 3.5 Test đăng nhập

Mở browser → `http://localhost:3000` (dev) hoặc `http://localhost:3001` (production) → đăng nhập bằng email/password.
Nếu thành công sẽ redirect sang `/dashboard`.

---

## Bước 4: Setup Server (Dell Ubuntu)

### 4.1 Yêu cầu hệ thống

| Thành phần | Yêu cầu tối thiểu |
|-----------|-------------------|
| OS | Ubuntu 20.04+ |
| Node.js | v20+ (LTS) |
| RAM | 2GB+ (Dell i3/8GB OK) |
| Disk | 1GB cho app |
| Port | 3001 (hoặc tùy chọn) |

### 4.2 Cài đặt Node.js

```bash
# Cài Node.js 20 LTS via nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
node -v  # v20.x.x
```

### 4.3 Clone và cài đặt

```bash
# Clone repo
cd /opt
git clone <repo-url> luna-hrm
cd luna-hrm

# Install dependencies
npm install

# Tạo file .env.local
cp .env.example .env.local
nano .env.local
```

### 4.4 Cấu hình .env.local

```bash
# === Supabase (BẮT BUỘC) ===
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

# === Cron Security (BẮT BUỘC) ===
# Tạo random string: openssl rand -hex 32
CRON_SECRET=your-random-secret-here

# === App URL (cho reset password email redirect) ===
NEXT_PUBLIC_APP_URL=https://hrm.lunaenglish.vn
```

> **Tạo CRON_SECRET:**
> ```bash
> openssl rand -hex 32
> ```
> Copy output paste vào `CRON_SECRET=`

### 4.5 Build production

```bash
npm run build
```

Kết quả mong đợi: `✓ Generating static pages`, 24 routes, 0 errors.

### 4.6 Test chạy thử

```bash
npm start -- -p 3001
# Mở browser: http://<server-ip>:3001
```

---

## Bước 5: PM2 Process Manager

### 5.1 Cài PM2

```bash
npm install -g pm2
```

### 5.2 Tạo file ecosystem

Tạo file `ecosystem.config.js` trong thư mục project:

```javascript
module.exports = {
  apps: [{
    name: 'luna-hrm',
    script: 'node_modules/.bin/next',
    args: 'start -p 3001',
    cwd: '/opt/luna-hrm',
    env: {
      NODE_ENV: 'production',
    },
    // Restart policies
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '500M',
    // Logs
    error_file: '/var/log/luna-hrm/error.log',
    out_file: '/var/log/luna-hrm/output.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }]
}
```

### 5.3 Tạo thư mục log + khởi chạy

```bash
sudo mkdir -p /var/log/luna-hrm
sudo chown $USER:$USER /var/log/luna-hrm

# Khởi chạy
pm2 start ecosystem.config.js

# Auto-start khi reboot
pm2 startup
pm2 save

# Kiểm tra status
pm2 status
pm2 logs luna-hrm
```

### 5.4 Lệnh PM2 thường dùng

```bash
pm2 status              # Xem trạng thái
pm2 logs luna-hrm       # Xem logs real-time
pm2 restart luna-hrm    # Restart app
pm2 stop luna-hrm       # Dừng app
pm2 reload luna-hrm     # Zero-downtime reload
```

---

## Bước 6: Caddy Reverse Proxy (HTTPS)

### 6.1 Cài Caddy

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudflare.com/cloudflare-workers-caddyfile/deb/debian/focal/amd64.list' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

Hoặc cách nhanh:

```bash
sudo apt install caddy
```

### 6.2 Cấu hình Caddyfile

```bash
sudo nano /etc/caddy/Caddyfile
```

Nội dung:

```caddyfile
hrm.lunaenglish.vn {
    reverse_proxy localhost:3001
    encode gzip
}
```

> Nếu chưa có domain, dùng IP:
> ```caddyfile
> :80 {
>     reverse_proxy localhost:3001
> }
> ```

### 6.3 Khởi chạy Caddy

```bash
sudo systemctl enable caddy
sudo systemctl start caddy
sudo systemctl status caddy
```

Caddy tự động cấp và renew SSL certificate cho domain.

---

## Bước 7: Setup Cron Jobs

App có 2 cron endpoints cần gọi định kỳ:

| Endpoint | Tần suất | Mục đích |
|----------|---------|----------|
| `/api/cron/weekly-reminder` | Thứ 7, 17:00 | Nhắc BM chưa lưu chấm công |
| `/api/cron/kpi-reminder` | Ngày 25 hàng tháng, 9:00 | Nhắc BM chưa chấm KPI |

### 7.1 Thêm crontab

```bash
crontab -e
```

Thêm vào cuối file:

```crontab
# Luna HRM Cron Jobs
# Weekly reminder — Saturday 17:00
0 17 * * 6 curl -s -H "x-cron-secret: YOUR_CRON_SECRET" https://hrm.lunaenglish.vn/api/cron/weekly-reminder > /dev/null

# KPI reminder — 25th monthly at 09:00
0 9 25 * * curl -s -H "x-cron-secret: YOUR_CRON_SECRET" https://hrm.lunaenglish.vn/api/cron/kpi-reminder > /dev/null
```

> Thay `YOUR_CRON_SECRET` bằng giá trị trong `.env.local`.
> Thay URL bằng domain thực tế (hoặc `http://localhost:3001` nếu cron chạy trên cùng server).

### 7.2 Verify crontab

```bash
crontab -l
```

---

## Bước 8: Tạo Thêm User (Sau Khi Deploy)

### Quy trình tạo user mới

Admin đăng nhập → vào `/employees` → tạo nhân viên mới.
Khi tạo employee, hệ thống tự động:
1. Tạo auth user (Supabase Auth)
2. Set `app_metadata` (role + branch_id)
3. Tạo employee record (employees.id = auth.users.id)

### 4 loại role

| Role | Tạo bởi | Quyền |
|------|---------|-------|
| `admin` | Admin | Toàn quyền, tất cả chi nhánh |
| `branch_manager` | Admin | CRUD chi nhánh mình, chấm công, KPI |
| `accountant` | Admin | Xem tất cả, CRUD lương |
| `employee` | Admin/BM | Xem dữ liệu cá nhân (read-only) |

---

## Bước 9: Cập Nhật (Update)

### Quy trình update app

```bash
cd /opt/luna-hrm

# Pull code mới
git pull origin main

# Install dependencies (nếu có thay đổi)
npm install

# Build lại
npm run build

# Restart app (zero-downtime)
pm2 reload luna-hrm
```

### Nếu có migration mới

1. Mở Supabase Dashboard → SQL Editor
2. Paste nội dung migration file mới
3. Run
4. Restart app

---

## Bước 10: Kiểm Tra Sau Deploy

### Checklist xác nhận

- [ ] Truy cập `https://hrm.lunaenglish.vn/login` hiện trang đăng nhập
- [ ] Đăng nhập admin thành công → redirect `/dashboard`
- [ ] Tạo chi nhánh mới OK
- [ ] Tạo nhân viên mới OK (auth user + employee record)
- [ ] Vào chấm công: hiện grid tuần
- [ ] Vào tính lương: tạo kỳ lương + tính tự động
- [ ] Employee đăng nhập → xem `/my-attendance`, `/my-payslips`
- [ ] Mobile: bottom nav hiển thị đúng
- [ ] Cron test: `curl -H "x-cron-secret: xxx" https://hrm.lunaenglish.vn/api/cron/weekly-reminder`
- [ ] PM2 status: `pm2 status` hiện `online`
- [ ] HTTPS: SSL certificate active (Caddy auto)

---

## Troubleshooting

### App không khởi động

```bash
# Kiểm tra logs
pm2 logs luna-hrm --lines 50

# Kiểm tra .env.local đầy đủ
cat /opt/luna-hrm/.env.local

# Kiểm tra port đã dùng chưa
lsof -i :3001
```

### Lỗi "Missing SUPABASE_SERVICE_ROLE_KEY"

File `.env.local` thiếu key. Kiểm tra lại 3 biến Supabase.

### Lỗi RLS "new row violates row-level security policy"

User đang thao tác không có quyền. Kiểm tra:
1. `app_metadata` đã set đúng role chưa (Supabase Dashboard → Auth → Users → click user)
2. Employee record có tồn tại và `is_active = true` không

### Lỗi cron 401 Unauthorized

`CRON_SECRET` trong `.env.local` không khớp với header `x-cron-secret` trong crontab.

### Lỗi RLS "infinite recursion" (42P17)

Lỗi này xảy ra khi policy query cùng bảng. Fix:
- Dùng hàm `get_current_user_is_active()` (SECURITY DEFINER) trong policy
- Hoặc dùng `createAdminClient()` trong code (với audit logging)
- Kiểm tra `supabase/migrations/011_fix_rls_recursion.sql`

### Database đầy (500MB limit)

```sql
-- Kiểm tra dung lượng
SELECT pg_size_pretty(pg_database_size('postgres'));

-- Xoá audit logs cũ (giữ 6 tháng)
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '6 months';
```

### Build lỗi

```bash
# Xoá cache và build lại
rm -rf .next
npm run build
```

---

## Cấu Trúc Quan Trọng

### Files không được commit

```
.env.local              # API keys, secrets
node_modules/           # Dependencies
.next/                  # Build output
```

### Migration files (chạy theo thứ tự)

```
supabase/migrations/
├── 000_reset_database.sql              # Full reset (dev only)
├── 001_create_all_tables.sql           # 17 bảng + FK + constraints
├── 002_rls_policies.sql                # 68 RLS policies (4 roles)
├── 003_indexes.sql                     # Performance indexes
├── 004_add_payslip_deductions_column.sql  # Payslip deductions
├── 005_audit_logs.sql                  # Audit log table + RLS
├── 006_fix_table_permissions.sql       # Table permission fixes
├── 007_payslip_audit_logs.sql          # Audit logs for payslip edits
├── 008_attendance_lock_override.sql    # Lock override + multi-row lock
├── 009_payroll_class_breakdown.sql     # Per-class rates + class_breakdown
├── 010_security_and_index_improvements.sql  # Security/index improvements
├── 011_fix_rls_recursion.sql           # RLS recursion fix
└── **012_employee_payslip_confirmation.sql**   # **Email confirmation workflow (Phase 6)**
```

---

## Bước X: Thiết Lập Resend Email (Phase 6)

### X.1 Tạo Resend account

1. Truy cập [resend.com](https://resend.com)
2. Đăng ký với email (miễn phí 100 email/ngày)
3. Verify domain (optional, nhưng nên làm để tránh spam filter):
   - Thêm DNS records (CNAME, SPF, DKIM)
   - Xác minh thành công trong Resend dashboard

### X.2 Lấy API key

1. Vào **API Keys** trong Resend dashboard
2. Copy `API Key` (bắt đầu bằng `re_...`)
3. Thêm vào `.env.local`:

```bash
# File: .env.local
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> **QUAN TRỌNG:** Không commit `.env.local` lên git (đã trong `.gitignore`)

### X.3 Cấu hình Cron emails

Thêm 2 cron job mới vào crontab (Ubuntu):

```bash
# Edit crontab
crontab -e

# Thêm 2 dòng (chạy hàng ngày lúc 9:00 AM)
0 9 * * * curl -s -H "x-cron-secret: $CRON_SECRET" https://hrm.domain/api/cron/auto-confirm-payslips
0 9 * * * curl -s -H "x-cron-secret: $CRON_SECRET" https://hrm.domain/api/cron/payslip-reminder
```

**Giải thích:**
- `auto-confirm-payslips`: Tự động xác nhận bảng lương sau 3 ngày không phản hồi
- `payslip-reminder`: Nhắc nhở nhân viên vào ngày 2 nếu chưa xác nhận

---

## Cấu Trúc Quan Trọng

| Service | Port | Protocol |
|---------|------|----------|
| Luna HRM (Next.js) | 3001 | HTTP |
| Caddy (reverse proxy) | 80/443 | HTTP/HTTPS |
| Supabase Cloud | N/A | HTTPS (external) |

---

## Liên Hệ Hỗ Trợ

- **Code repo:** Private GitHub repo
- **Database:** Supabase Cloud Dashboard
- **Server:** SSH vào Dell Ubuntu
- **Logs:** `pm2 logs luna-hrm` hoặc `/var/log/luna-hrm/`

---

*Tài liệu này do Antigravity team sử dụng nội bộ. Cập nhật: 2026-03-15*
