# Deploy Hotfix: Kanban Drag-Drop + Form Reset

**Ngày:** 2026-03-01
**Commit:** `e47736b` — `fix: resolve kanban drag-drop errors from DB triggers`

---

## Tổng quan thay đổi

| # | Vấn đề | File/Migration | Đã fix |
|---|--------|----------------|--------|
| 1 | Kéo thả lead báo lỗi "case not found" | Migration 025 | Thêm `ELSE NULL` vào trigger `create_stage_reminder()` |
| 2 | Kéo thả lead báo lỗi "ON CONFLICT" | Migration 026 | Đổi `ON CONFLICT` sang `NOT EXISTS` trong trigger `create_student_on_enrollment()` |
| 3 | `ensureUserProfile` crash khi thiếu SERVICE_ROLE_KEY | `lib/actions/ensure-user-profile.ts` | Thêm guard check trước khi gọi admin client |
| 4 | Log lỗi không đủ chi tiết | `lib/actions/lead-actions.ts` | Thêm error code/details vào log |

---

## Bước deploy

### Bước 1: Database (Supabase) — DA XONG

Migration 025 và 026 đã được chạy trực tiếp trên Supabase Dashboard SQL Editor.
**Không cần làm gì thêm.**

### Bước 2: Code (Homeserver)

SSH vào homeserver rồi chạy:

```bash
# 1. Vào thư mục project
cd /path/to/luna-english-crm

# 2. Pull code mới
git pull origin main

# 3. Rebuild Docker container
docker compose down
docker compose build --no-cache luna-crm
docker compose up -d

# 4. Kiểm tra container healthy
docker compose ps
# Đợi ~30s rồi check lại, status phải là "healthy"

# 5. Xem log có lỗi không
docker compose logs -f luna-crm --tail=50
# Ctrl+C để thoát
```

### Bước 3: Verify sau deploy

1. Mở CRM trên browser
2. Vào trang **Pipeline**
3. **Test kéo thả:** kéo 1 lead sang cột khác → phải hiện "Đã chuyển trạng thái lead"
4. **Test thêm lead:** bấm nút thêm lead, điền form, submit → phải thành công
5. Refresh trang → lead phải ở đúng vị trí mới

---

## Rollback (nếu cần)

```bash
# Quay về commit trước
cd /path/to/luna-english-crm
git checkout b238407
docker compose down
docker compose build --no-cache luna-crm
docker compose up -d
```

**Lưu ý:** Rollback code không ảnh hưởng database. Migration 025/026 trên Supabase vẫn giữ nguyên (không gây hại, chỉ thêm safety cho trigger).
