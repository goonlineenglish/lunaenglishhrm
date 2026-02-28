# Hướng dẫn Deploy Security Fixes — Commit 440aba6

**Ngày:** 2026-02-27
**Commit:** `440aba6 fix: resolve security and robustness issues in auth, actions, and UI`

---

## Tóm tắt thay đổi

| File | Loại thay đổi |
|------|--------------|
| `lib/actions/ensure-user-profile.ts` | Default role `admin` → `advisor` |
| `supabase/migrations/024_backfill-missing-user-profiles.sql` | Default role `admin` → `advisor` trong SQL backfill |
| `components/pipeline/quick-add-lead-sheet.tsx` | Fix encoding Mojibake/BOM |
| `lib/actions/student-actions.ts` | `getStudents` trả về lỗi thay vì im lặng |
| `app/(dashboard)/students/students-client.tsx` | Hiển thị toast khi `getStudents` lỗi |
| `lib/actions/reminder-actions.ts` | UUID validation, try/catch, ẩn error.message, thêm `ensureUserProfile` vào `skipReminder` |

---

## Bước 1: Pull code mới nhất về server

```bash
cd /opt/luna-crm   # hoặc đường dẫn deploy của bạn
git pull origin main
```

Xác nhận commit đúng:
```bash
git log --oneline -3
# Dòng đầu phải là: 440aba6 fix: resolve security and robustness issues...
```

---

## Bước 2: Chạy migration SQL trên Supabase Cloud

> **Bắt buộc** — migration 024 đã thay đổi default role từ `admin` → `advisor`.
> Migration này idempotent (chỉ backfill user chưa có profile), an toàn để chạy lại.

### Cách chạy (chọn 1 trong 2):

**Option A — Supabase CLI (khuyến nghị):**
```bash
npx supabase db push --db-url "postgresql://postgres:[PASSWORD]@db.vgxpucmwivhlgvlzzkju.supabase.co:5432/postgres"
```

**Option B — SQL Editor trên Dashboard:**
1. Vào [Supabase Dashboard](https://supabase.com/dashboard) → project `vgxpucmwivhlgvlzzkju`
2. Mở **SQL Editor**
3. Paste và chạy nội dung file `supabase/migrations/024_backfill-missing-user-profiles.sql`

### Kiểm tra sau migration:
```sql
-- Xác nhận không còn user nào có role = 'admin' do backfill tự động
-- (chỉ user được set admin thủ công mới có role admin)
SELECT id, email, role FROM public.users ORDER BY created_at DESC LIMIT 20;
```

---

## Bước 3: Rebuild và restart app

### Nếu đang dùng Docker:
```bash
docker compose build luna-crm
docker compose up -d luna-crm
docker compose logs -f luna-crm --tail=50
```

### Nếu đang chạy Node trực tiếp (pm2):
```bash
npm ci --omit=dev
npm run build
pm2 restart luna-crm
pm2 logs luna-crm --lines 50
```

### Nếu deploy trên Vercel:
Vercel sẽ tự build khi có push lên `main`. Không cần làm gì thêm.
Vào Vercel Dashboard kiểm tra deployment status.

---

## Bước 4: Smoke test sau deploy

Kiểm tra các tính năng bị ảnh hưởng:

### 4.1 Tạo lead mới
- Vào `/pipeline` → click **+ Thêm lead**
- Sheet mở ra với text tiếng Việt đúng (không còn ký tự lạ như `ThÃªm`, `Äang`)
- Điền form → nhấn **Tạo lead** → toast "Tạo lead thành công"

### 4.2 Danh sách học sinh
- Vào `/students`
- Danh sách hiện ra bình thường
- Nếu có lỗi DB → toast tiếng Việt thay vì trang trắng

### 4.3 Nhắc nhở (reminders)
- Vào `/reminders`
- Thử **Hoàn thành** và **Bỏ qua** một reminder
- Không xuất hiện lỗi 500

### 4.4 Đăng ký user mới (quan trọng nhất)
- Tạo 1 user test mới qua Supabase Dashboard (Auth → Users → Add User)
- **Không set** `role` trong metadata
- Đăng nhập bằng user đó
- Vào Supabase → Table Editor → `public.users` → xác nhận user mới có `role = 'advisor'` (không phải `admin`)

---

## Không cần làm gì thêm

- Không cần thay đổi `.env` hay biến môi trường
- Không cần xóa cache hay clear database
- Các user đang đăng nhập sẽ không bị ảnh hưởng (session vẫn hợp lệ)

---

## Rollback (nếu cần)

```bash
git revert 440aba6 --no-edit
git push origin main
# Rồi rebuild lại như bước 3
```

Migration SQL không cần rollback vì nó chỉ backfill data, không xóa.
