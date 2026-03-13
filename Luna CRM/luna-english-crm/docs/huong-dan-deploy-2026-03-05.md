# Hướng dẫn Deploy — Luna CRM cập nhật 2026-03-05

> Gửi Antigravity team deploy.
> Tài liệu gộp tất cả thay đổi kể từ bản deploy trước (`03cab06` trở đi).
> **Phiên bản: v0.4.2**

---

## Tóm tắt thay đổi

### A. Student Hub — Phase 1 (commit `03cab06`)
- **7 bảng mới** trong Supabase: student profiles mở rộng, attendance, teacher comments, scores, fee records, learning paths, milestones
- Google Sheets 2-way sync (đồng bộ dữ liệu học sinh ↔ Google Sheet)
- Cron job mới: `/api/cron/sync-google-sheets` (mỗi 15 phút)
- Student profile UI tổng hợp (tab thông tin, điểm danh, nhận xét, điểm)

### B. Soft Delete (v0.4.2)
- **Xóa mềm** thay vì xóa cứng cho: leads, students, lead_activities, lead_stage_notes
- Trang **Thùng rác** (`/trash`) — chỉ Admin thấy, khôi phục dữ liệu đã xóa
- Nút xóa trên giao diện lead detail, student detail, activity list
- Cascade: xóa lead → tự động xóa activities + stage notes; khôi phục lead → tự khôi phục
- Phân quyền: Admin xóa/khôi phục tất cả, Advisor chỉ xóa lead/activity của mình, Marketing không được xóa

### C. Bảo mật & Bug fixes
- Tất cả query lọc `deleted_at IS NULL` (tránh hiển thị dữ liệu đã xóa)
- Cron jobs lọc deleted data (không gửi reminder/notification cho lead đã xóa)
- Kiểm tra zero-row: thao tác xóa/khôi phục báo lỗi chính xác nếu ID không tồn tại
- Dashboard views cập nhật loại bỏ dữ liệu đã xóa
- RLS policies cập nhật cho advisor/marketing tự động lọc deleted

---

## Bước 1: Pull code mới nhất

```bash
cd /opt/luna-crm
git pull origin main
```

Xác nhận commit:
```bash
git log --oneline -3
```

---

## Bước 2: Chạy migration SQL trên Supabase (BẮT BUỘC)

> Có **7 file migration mới** (029-035) cần chạy **theo thứ tự**.

Vào [Supabase Dashboard](https://supabase.com/dashboard) → project `vgxpucmwivhlgvlzzkju` → **SQL Editor**.

### 2.1 Migration 029 — Mở rộng bảng students
Paste toàn bộ nội dung file:
```
supabase/migrations/029_extend-students-add-program-types.sql
```
Nhấn **Run**.

### 2.2 Migration 030 — Bảng dữ liệu EasyCheck
Paste toàn bộ nội dung file:
```
supabase/migrations/030_create-easycheck-data-tables.sql
```
Nhấn **Run**.

### 2.3 Migration 031 — Bảng learning path
Paste toàn bộ nội dung file:
```
supabase/migrations/031_create-learning-path-tables.sql
```
Nhấn **Run**.

### 2.4 Migration 032 — Sheet sync snapshots
Paste toàn bộ nội dung file:
```
supabase/migrations/032_create-sheet-sync-snapshots.sql
```
Nhấn **Run**.

### 2.5 Migration 033 — RLS cho Student Hub
Paste toàn bộ nội dung file:
```
supabase/migrations/033_add-rls-student-hub-tables.sql
```
Nhấn **Run**.

### 2.6 Migration 034 — Student Hub gap fixes
Paste toàn bộ nội dung file:
```
supabase/migrations/034_student-hub-phase1-gaps.sql
```
Nhấn **Run**.

### 2.7 Migration 035 — Soft Delete (quan trọng!)
Paste toàn bộ nội dung file:
```
supabase/migrations/035_soft-delete-columns-rls-views.sql
```
Nhấn **Run**.

### Kiểm tra sau migration:

```sql
-- 1. Xác nhận cột deleted_at đã có trên leads
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'leads' AND column_name = 'deleted_at';
-- Phải thấy: deleted_at | timestamp with time zone

-- 2. Xác nhận cascade trigger hoạt động
SELECT tgname FROM pg_trigger WHERE tgname = 'trg_cascade_soft_delete_lead';
-- Phải thấy: trg_cascade_soft_delete_lead

-- 3. Xác nhận partial indexes tạo thành công
SELECT indexname FROM pg_indexes
WHERE indexname IN ('idx_leads_active', 'idx_students_active', 'idx_lead_activities_active');
-- Phải thấy 3 dòng

-- 4. Xác nhận bảng Student Hub
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('attendance_records', 'teacher_comments', 'student_scores', 'fee_records', 'learning_paths', 'learning_milestones', 'sheet_sync_snapshots');
-- Phải thấy 7 bảng

-- 5. Xác nhận RLS policies cho soft delete
SELECT policyname FROM pg_policies
WHERE tablename = 'leads' AND policyname LIKE '%soft%';
-- Phải thấy policy name chứa "soft"
```

---

## Bước 3: Cập nhật biến môi trường (NẾU CHƯA CÓ)

Kiểm tra `.env.production` có các biến sau (cần cho Google Sheets sync):

```bash
# Google Sheets sync (cần nếu muốn dùng đồng bộ Google Sheet)
GOOGLE_SHEETS_SPREADSHEET_ID=your-spreadsheet-id
GOOGLE_SHEETS_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

Nếu chưa dùng Google Sheets sync, có thể bỏ qua bước này.

---

## Bước 4: Cập nhật Cron jobs

### Docker (homeserver):
Chạy lại script cron để thêm job mới (sync-google-sheets):

```bash
chmod +x deploy/cron-setup.sh
./deploy/cron-setup.sh /opt/luna-crm
```

Hoặc thêm thủ công vào crontab (`crontab -e`):
```bash
# Sync Google Sheets - every 15 minutes
*/15 * * * * curl -sf --max-time 30 -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/sync-google-sheets >> /var/log/luna-crm/sheets-sync.log 2>&1
```

### Vercel:
Đã cấu hình sẵn trong `vercel.json`. Không cần làm gì.

---

## Bước 5: Rebuild và restart app

### Docker (homeserver):
```bash
docker compose build luna-crm
docker compose up -d luna-crm
docker compose logs -f luna-crm --tail=50
```

### Node trực tiếp (pm2):
```bash
npm ci --omit=dev
npm run build
pm2 restart luna-crm
pm2 logs luna-crm --lines 50
```

### Vercel:
Tự build khi push lên `main`. Không cần làm gì.

---

## Bước 6: Kiểm tra sau deploy

### 6.1 Pipeline (`/pipeline`)
- [ ] Kanban hiển thị bình thường, kéo thả hoạt động
- [ ] Mở chi tiết lead → thấy nút **Xóa** (biểu tượng thùng rác)
- [ ] Nhấn Xóa → hiện dialog xác nhận → xác nhận → lead biến mất khỏi Kanban
- [ ] Đăng nhập Advisor → chỉ xóa được lead của mình
- [ ] Đăng nhập Marketing → không thấy nút Xóa

### 6.2 Thùng rác (`/trash`) — chỉ Admin
- [ ] Đăng nhập Admin → sidebar thấy mục **Thùng rác**
- [ ] Vào `/trash` → 3 tab: Leads, Học sinh, Hoạt động
- [ ] Lead vừa xóa xuất hiện trong tab Leads
- [ ] Nhấn **Khôi phục** → lead quay lại Kanban
- [ ] Đăng nhập không phải Admin → vào `/trash` → bị redirect về `/pipeline`

### 6.3 Học sinh (`/students`)
- [ ] Mở chi tiết học sinh → thấy nút Xóa (chỉ Admin)
- [ ] Xóa học sinh → hiện trong `/trash` tab Học sinh

### 6.4 Student Hub
- [ ] Mở chi tiết học sinh → thấy các tab mới (Điểm danh, Nhận xét, Điểm, Học phí)
- [ ] Dữ liệu đồng bộ Google Sheet hoạt động (nếu đã cấu hình)

### 6.5 Dashboard (`/reports`)
- [ ] Biểu đồ không tính dữ liệu đã soft-delete
- [ ] Số liệu KPI chính xác

---

## Không cần thay đổi

- Tài khoản user hiện tại giữ nguyên
- Lead/student hiện tại không bị ảnh hưởng (deleted_at mặc định NULL = active)
- Không cần xóa cache hay database

---

## Rollback (nếu cần)

### Code:
```bash
git revert HEAD --no-edit
git push origin main
# Rebuild lại như bước 5
```

### SQL rollback soft delete (nếu cần):
```sql
-- Xóa trigger cascade
DROP TRIGGER IF EXISTS trg_cascade_soft_delete_lead ON public.leads;
DROP FUNCTION IF EXISTS public.cascade_soft_delete_lead();

-- Xóa partial indexes
DROP INDEX IF EXISTS idx_leads_active;
DROP INDEX IF EXISTS idx_students_active;
DROP INDEX IF EXISTS idx_lead_activities_active;

-- Xóa cột deleted_at (CHÚ Ý: mất dữ liệu trash)
ALTER TABLE leads DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE students DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE lead_activities DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE lead_stage_notes DROP COLUMN IF EXISTS deleted_at;
```

> ⚠ Rollback SQL sẽ xóa vĩnh viễn dữ liệu trong thùng rác. Chỉ dùng khi thực sự cần.

---

## Liên hệ hỗ trợ

Nếu gặp lỗi sau deploy, gửi kèm:
1. Screenshot lỗi
2. Output: `docker compose logs luna-crm --tail=100`
3. Output: `deploy/cron-health-check.sh`
