# Hướng dẫn Deploy Tổng hợp — Luna CRM cập nhật 2026-03-02

> Gửi Antigravity team deploy. Tài liệu gộp tất cả thay đổi kể từ commit `e47736b` (bản đang chạy trên server).
> Commits mới: `faa7ad7`, `58d2fe0`, `1dc568c`, `1955a78`

---

## Tóm tắt thay đổi

### A. Đổi tên giai đoạn Pipeline (Kanban)

| Cột | Tên cũ | Tên mới |
|-----|--------|---------|
| Cột 2 | Đã tư vấn | **Đã tư vấn / Đang nurture** |
| Cột 3 | Đang nurture | **Kiểm tra đầu vào** |

- Reminder "Kiểm tra đầu vào": 7 ngày → **48 giờ**
- Checklist mặc định cập nhật theo tên mới
- DB enum giữ nguyên (`da_tu_van`, `dang_nurture`) — chỉ đổi label hiển thị

### B. Fix lỗi Kanban kéo thả (đã commit `e47736b`)
- Sửa lỗi DB trigger khi kéo lead vào các cột không có reminder
- Sửa lỗi student enrollment trigger bị conflict

### C. Fix quyền Advisor
- Advisor giờ có thể cập nhật trạng thái học sinh (trước đây chỉ Admin)

### D. Tối ưu trang Học sinh (`/students`)
- Thêm phân trang server-side 20 học sinh/trang (Next/Prev)
- Tìm kiếm server-side qua DB (không còn load toàn bộ data về client)
- Cập nhật hàng loạt nhanh hơn (batch query thay vì 1-by-1)
- Memoize callbacks — tránh re-render thừa khi tick checkbox

---

## Bước 1: Pull code mới nhất

```bash
cd /opt/luna-crm
git pull origin main
```

Xác nhận commit mới nhất:
```bash
git log --oneline -3
```

---

## Bước 2: Chạy migration SQL trên Supabase (BẮT BUỘC)

> Có **4 file migration mới** (025-028) cần chạy **theo thứ tự**.

Vào [Supabase Dashboard](https://supabase.com/dashboard) → project `vgxpucmwivhlgvlzzkju` → **SQL Editor**.

### 2.1 Migration 025 — Fix trigger CASE missing ELSE
Paste toàn bộ nội dung file:
```
supabase/migrations/025_fix-stage-trigger-missing-else.sql
```
Nhấn **Run**.

### 2.2 Migration 026 — Fix student enrollment trigger
Paste toàn bộ nội dung file:
```
supabase/migrations/026_fix-student-enrollment-on-conflict.sql
```
Nhấn **Run**.

### 2.3 Migration 027 — Cho phép Advisor cập nhật học sinh
Paste toàn bộ nội dung file:
```
supabase/migrations/027_allow-advisor-update-student-status.sql
```
Nhấn **Run**.

### 2.4 Migration 028 — Đổi tên stage + checklist
Paste toàn bộ nội dung file:
```
supabase/migrations/028_update-stage-labels-and-checklist.sql
```
Nhấn **Run**.

### Kiểm tra sau migration:
```sql
-- 1. Xác nhận trigger mới hoạt động (không lỗi)
SELECT prosrc FROM pg_proc WHERE proname = 'create_stage_reminder';
-- Phải thấy INTERVAL '48 hours' cho dang_nurture

-- 2. Xác nhận checklist
SELECT stage, steps FROM stage_next_step_configs
WHERE stage IN ('da_tu_van', 'dang_nurture');
-- da_tu_van: "Gọi điện tư vấn chi tiết", "Gửi tài liệu tư vấn & content mẫu", "Follow up & nurture định kỳ"
-- dang_nurture: "Liên hệ lên lịch kiểm tra đầu vào", "Gửi bài test đầu vào", "Đánh giá kết quả và tư vấn lộ trình"

-- 3. Xác nhận RLS policy advisor
SELECT policyname FROM pg_policies WHERE tablename = 'students' AND policyname LIKE '%advisor%';
-- Phải có: advisor_students_update
```

---

## Bước 3: Rebuild và restart app

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

## Bước 4: Kiểm tra sau deploy

### 4.1 Bảng Kanban (`/pipeline`)
- [ ] Cột 2 hiện **"Đã tư vấn / Đang nurture"**
- [ ] Cột 3 hiện **"Kiểm tra đầu vào"**
- [ ] Kéo 1 lead sang bất kỳ cột nào → không bị lỗi 500
- [ ] Kéo lead vào "Kiểm tra đầu vào" → vào `/reminders` kiểm tra reminder **48 giờ**

### 4.2 Checklist
- [ ] Mở chi tiết lead ở "Kiểm tra đầu vào"
- [ ] Checklist hiện: (1) Liên hệ lên lịch kiểm tra, (2) Gửi bài test, (3) Đánh giá kết quả

### 4.3 Trang Học sinh (`/students`)
- [ ] Trang load không bị treo (không còn load toàn bộ data)
- [ ] Có nút phân trang **Trước / Sau** ở dưới bảng, hiện "Trang X / Y · Z học sinh"
- [ ] Gõ tên/SĐT vào ô tìm kiếm → kết quả từ server (không phải filter client)
- [ ] Thay đổi trạng thái 1 học sinh → hoạt động bình thường
- [ ] Đăng nhập bằng tài khoản Advisor → có thể đổi trạng thái học sinh

### 4.4 Dashboard (`/reports`)
- [ ] Biểu đồ funnel hiện tên stage mới

---

## Không cần làm gì thêm

- Không thay đổi `.env` hay biến môi trường
- Không xóa cache hay database
- Lead hiện tại giữ nguyên vị trí, chỉ đổi tên hiển thị
- User đang đăng nhập không bị ảnh hưởng

---

## Rollback (nếu cần)

### Code:
```bash
git revert HEAD --no-edit
git push origin main
# Rebuild lại như bước 3
```

### SQL (nếu cần quay lại tên cũ):
```sql
-- Chạy lại file 025 để khôi phục trigger 7 ngày:
-- supabase/migrations/025_fix-stage-trigger-missing-else.sql

-- Khôi phục checklist cũ:
UPDATE stage_next_step_configs
SET steps = '[
  {"id": "4", "label": "Gọi điện tư vấn chi tiết", "order": 1},
  {"id": "5", "label": "Gửi tài liệu tư vấn", "order": 2},
  {"id": "6", "label": "Đề xuất xếp lịch học thử", "order": 3}
]'
WHERE stage = 'da_tu_van';

UPDATE stage_next_step_configs
SET steps = '[
  {"id": "7", "label": "Gửi content/bài tập mẫu", "order": 1},
  {"id": "8", "label": "Check-in sau 3 ngày", "order": 2},
  {"id": "9", "label": "Mời tham gia webinar/sự kiện", "order": 3}
]'
WHERE stage = 'dang_nurture';
```

Migration 027 (advisor RLS) an toàn, không cần rollback.
