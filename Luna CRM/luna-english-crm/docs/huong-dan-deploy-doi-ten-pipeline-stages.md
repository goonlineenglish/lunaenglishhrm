# Hướng dẫn Deploy — Đổi tên giai đoạn Pipeline

**Ngày:** 2026-03-02

---

## Tóm tắt thay đổi

Đổi tên 2 giai đoạn trên bảng Kanban pipeline:

| Giai đoạn | Tên cũ | Tên mới |
|-----------|--------|---------|
| Cột thứ 2 | Đã tư vấn | **Đã tư vấn / Đang nurture** |
| Cột thứ 3 | Đang nurture | **Kiểm tra đầu vào** |

**Thay đổi kèm theo:**
- SLA "Kiểm tra đầu vào": 7 ngày → **2 ngày** (nhắc nhanh hơn)
- Reminder tự động: 7 ngày → **48 giờ**
- Checklist mặc định cập nhật cho phù hợp tên mới

**Không thay đổi:**
- Database (cấu trúc bảng, enum giữ nguyên)
- Luồng kéo thả Kanban
- Tất cả tính năng khác

---

## Bước 1: Pull code mới nhất

```bash
cd /opt/luna-crm
git pull origin main
```

---

## Bước 2: Chạy migration SQL trên Supabase

> **Bắt buộc** — cập nhật trigger reminder + checklist defaults.

### Cách chạy (chọn 1 trong 2):

**Option A — SQL Editor trên Dashboard (đơn giản nhất):**
1. Vào [Supabase Dashboard](https://supabase.com/dashboard) → project `vgxpucmwivhlgvlzzkju`
2. Mở **SQL Editor**
3. Paste toàn bộ nội dung file `supabase/migrations/028_update-stage-labels-and-checklist.sql`
4. Nhấn **Run**

**Option B — Supabase CLI:**
```bash
npx supabase db push --db-url "postgresql://postgres:[PASSWORD]@db.vgxpucmwivhlgvlzzkju.supabase.co:5432/postgres"
```

### Kiểm tra sau migration:
```sql
-- Xác nhận checklist đã cập nhật
SELECT stage, steps FROM stage_next_step_configs
WHERE stage IN ('da_tu_van', 'dang_nurture');

-- da_tu_van phải có: "Gọi điện tư vấn chi tiết", "Gửi tài liệu tư vấn & content mẫu", "Follow up & nurture định kỳ"
-- dang_nurture phải có: "Liên hệ lên lịch kiểm tra đầu vào", "Gửi bài test đầu vào", "Đánh giá kết quả và tư vấn lộ trình"
```

---

## Bước 3: Rebuild và restart app

### Docker:
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
```

### Vercel:
Tự build khi push lên `main`. Không cần làm gì.

---

## Bước 4: Kiểm tra sau deploy

### 4.1 Bảng Kanban
- Vào `/pipeline`
- Cột thứ 2 phải hiện **"Đã tư vấn / Đang nurture"** (không phải "Đã tư vấn")
- Cột thứ 3 phải hiện **"Kiểm tra đầu vào"** (không phải "Đang nurture")

### 4.2 Kéo thả lead
- Kéo 1 lead vào cột "Kiểm tra đầu vào"
- Kiểm tra phần **Nhắc nhở** → phải tạo reminder **48 giờ** (không phải 7 ngày)

### 4.3 Checklist
- Mở chi tiết lead ở cột "Kiểm tra đầu vào"
- Checklist phải hiện:
  1. Liên hệ lên lịch kiểm tra đầu vào
  2. Gửi bài test đầu vào
  3. Đánh giá kết quả và tư vấn lộ trình

### 4.4 Dashboard
- Vào `/reports`
- Biểu đồ funnel phải hiện tên mới

---

## Không cần làm gì thêm

- Không cần thay đổi `.env`
- Không cần xóa cache hay database
- Lead hiện tại ở các giai đoạn cũ vẫn hoạt động bình thường (chỉ đổi tên hiển thị)
- Checklist của lead cũ giữ nguyên, chỉ lead mới kéo vào stage mới mới có checklist mới

---

## Rollback (nếu cần)

```bash
git revert HEAD --no-edit
git push origin main
# Rebuild lại như bước 3
```

Để rollback migration SQL, chạy trong SQL Editor:
```sql
-- Khôi phục trigger về interval 7 ngày cho dang_nurture
-- (chạy lại nội dung file 025_fix-stage-trigger-missing-else.sql)

-- Khôi phục checklist defaults
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
