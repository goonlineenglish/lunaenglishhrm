# Hướng Dẫn Deploy: Security Fixes & Auth Guards — 2026-02-28

**Phiên bản:** 3 commits mới nhất trên nhánh `main`
**Dự án:** Luna English CRM — `goonlineenglish/luna-english-crm`
**Máy chủ:** Homeserver, thư mục `/opt/luna-crm`
**Người thực hiện:** Đội Antigravity

---

## 1. Tóm Tắt Các Lỗi Đã Sửa

### Lỗi nghiêm trọng đã xử lý trong đợt này:

| Commit | Mô tả |
|--------|-------|
| `9dc71c7` | Thêm auth guard cho tất cả server actions — chặn truy cập trái phép |
| `fd342d0` | Cập nhật cấu hình deploy: Dockerfile, docker-compose, Caddy, scripts |
| `37fa698` | Thêm QA reports, migration 024, rebuild.sh |
| `ec50034` | (Đã có trước) Sửa lỗi Resend lazy-init — nguyên nhân gốc gây treo trang |

### Chi tiết sửa lỗi:

**Auth Guards (`9dc71c7`) — Quan trọng nhất:**
- `notification-actions.ts`: Bỏ tham số `userId` tin tưởng từ client, lấy từ `getUser()` phía server
- `dashboard-actions.ts`: Thêm xác thực trước khi truy vấn dữ liệu dashboard
- `reminder-actions.ts`: `getReminders()` luôn scope theo user đang đăng nhập
- `message-actions.ts`: Thêm xác thực cho `queueMessage()`, validate UUID
- `integration-actions.ts`: Thêm xác thực cho test kết nối Zalo/Facebook và xem webhook events
- `student-actions.ts`: Thêm xác thực cho `getStudents()`, validate `lead_id` trong CSV import

**Lỗi "Tạo lead treo / Trạng thái học sinh không lưu" (`ec50034`):**
- Nguyên nhân gốc: `new Resend(apiKey)` chạy ngay khi module được load, crash toàn bộ SSR khi `RESEND_API_KEY` không có
- Đã sửa: khởi tạo lazy (chỉ tạo instance khi thực sự gọi hàm)
- Nếu chưa deploy commit này → phải deploy ngay

---

## 2. Yêu Cầu Trước Khi Deploy

Kiểm tra các điều kiện sau trước khi bắt đầu:

- [ ] Có quyền SSH vào homeserver
- [ ] Docker và Docker Compose đang chạy (`docker ps` không báo lỗi)
- [ ] File `.env.production` đã tồn tại tại `/opt/luna-crm/.env.production`
- [ ] Kết nối internet từ server đến GitHub hoạt động (`curl https://github.com`)
- [ ] Có tài khoản Supabase với quyền chạy SQL trong project (cho Migration 024)
- [ ] Thời gian downtime dự kiến: ~2-3 phút trong lúc rebuild

---

## 3. Các Bước Deploy

### Bước 1: SSH vào server

```bash
ssh your-user@your-homeserver-ip
```

### Bước 2: Vào thư mục dự án

```bash
cd /opt/luna-crm
```

### Bước 3: Kiểm tra trạng thái hiện tại

```bash
# Xem container đang chạy
docker compose ps

# Xem commit hiện tại đang deploy
git log --oneline -5
```

### Bước 4: Pull code mới nhất

```bash
git pull origin main
```

Kết quả mong đợi: thấy 3 commit mới (9dc71c7, fd342d0, 37fa698) được pull về.

### Bước 5: Kiểm tra file môi trường

```bash
# Xác nhận file .env.production tồn tại
ls -la .env.production

# Kiểm tra các biến bắt buộc có đủ không
grep -E "NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY" .env.production
```

Nếu thiếu biến nào → bổ sung trước khi tiếp tục (xem mục 7 — Lưu ý quan trọng).

### Bước 6: Rebuild và restart

```bash
# Dùng script rebuild.sh đã có sẵn
chmod +x rebuild.sh
./rebuild.sh
```

Script sẽ tự động:
1. Dừng toàn bộ container (`docker compose down`)
2. Export biến `NEXT_PUBLIC_*` từ `.env.production` làm build args
3. Build lại image từ đầu (`--no-cache`)
4. Khởi động lại container
5. Chờ 35 giây rồi hiển thị trạng thái

Toàn bộ quá trình mất khoảng 2-5 phút tùy tốc độ máy.

### Bước 7: Theo dõi log trong lúc build

Mở terminal thứ hai để xem log realtime:

```bash
docker compose logs -f luna-crm
```

Tìm dòng này để xác nhận khởi động thành công:

```
Ready in XXXXms
```

---

## 4. Chạy Migration 024 trên Supabase

Migration này **chỉ cần chạy một lần**. Kiểm tra xem đã chạy chưa trước khi thực hiện.

### Kiểm tra đã chạy chưa:

Vào **Supabase Dashboard** → **Table Editor** → bảng `users`.
Nếu tất cả tài khoản auth đều có dòng tương ứng trong bảng `users` → có thể bỏ qua.

Hoặc chạy câu query kiểm tra:

```sql
-- Đếm số auth.users chưa có public.users tương ứng
SELECT COUNT(*)
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL;
```

Nếu kết quả = 0 → **không cần chạy migration**, bỏ qua bước này.

### Cách chạy migration 024:

1. Vào **Supabase Dashboard** → **SQL Editor**
2. Mở file `supabase/migrations/024_backfill-missing-user-profiles.sql`
3. Copy toàn bộ nội dung và paste vào SQL Editor
4. Nhấn **Run**

Kết quả mong đợi: không có lỗi, trigger `on_auth_user_created` được tái tạo thành công.

**Tại sao cần migration này:**
- Trigger tự động tạo `public.users` từ `auth.users` đôi khi không chạy khi tạo user qua Supabase Dashboard
- Thiếu row trong `public.users` khiến `get_user_role()` trả về NULL
- Khi role = NULL, tất cả RLS write policy bị từ chối âm thầm → user không tạo/sửa được gì

---

## 5. Kiểm Tra Sau Deploy

### 5.1 Kiểm tra container

```bash
# Xem trạng thái tất cả container
docker compose ps
```

Kết quả mong đợi:
```
NAME       STATUS
luna-crm   Up X minutes (healthy)
caddy      Up X minutes
```

Nếu `luna-crm` hiển thị `(unhealthy)` hoặc `(starting)` → chờ thêm 1-2 phút rồi kiểm tra lại.

### 5.2 Kiểm tra log lỗi

```bash
# Xem 50 dòng log gần nhất
docker compose logs --tail=50 luna-crm

# Tìm lỗi nếu có
docker compose logs luna-crm 2>&1 | grep -i "error\|crash\|fatal"
```

Không được có dòng:
- `Error: Missing Resend API key` (lỗi Resend cũ)
- `Cannot read properties of undefined`
- `Module not found`

### 5.3 Kiểm tra HTTP response

```bash
# Từ bên trong server
curl -I http://localhost:80

# Hoặc nếu có domain
curl -I https://your-domain.com
```

Kết quả mong đợi: `HTTP/1.1 200 OK` hoặc `307 Temporary Redirect` (redirect sang /login).

### 5.4 Checklist kiểm tra chức năng

Đăng nhập vào app và kiểm tra từng luồng sau:

- [ ] **Đăng nhập** — vào được dashboard sau khi login
- [ ] **Tạo lead mới** — điền form Quick Add, nhấn Tạo, lead xuất hiện ngay trên Kanban (không treo "Đang tạo...")
- [ ] **Kéo lead sang cột khác** — drag & drop hoạt động, stage lưu thành công
- [ ] **Xem dashboard** — KPI cards và biểu đồ hiển thị đúng số liệu
- [ ] **Cập nhật trạng thái học sinh** — thay đổi status lưu ngay (không báo lỗi âm thầm)
- [ ] **Thông báo** — notification bell hiển thị đúng, đánh dấu đã đọc được
- [ ] **Nhắc nhở** — danh sách reminders load được

---

## 6. Rollback Nếu Có Lỗi

### Rollback về commit trước (nhanh nhất):

```bash
cd /opt/luna-crm

# Xem lịch sử commit
git log --oneline -10

# Quay về commit trước 3 commit hiện tại
git reset --hard HEAD~3

# Rebuild với code cũ
./rebuild.sh
```

### Hoặc rollback về commit cụ thể:

```bash
# Thay <commit-hash> bằng hash của commit muốn quay về
git reset --hard <commit-hash>
./rebuild.sh
```

### Nếu rebuild.sh cũng lỗi, dùng cách thủ công:

```bash
docker compose down
export $(grep NEXT_PUBLIC .env.production | xargs)
docker compose build --no-cache
docker compose up -d
```

### Rollback Migration 024:

Migration 024 chỉ thêm dữ liệu và tái tạo trigger — **không xóa dữ liệu cũ**. Nếu cần rollback:

```sql
-- Xóa trigger nếu muốn
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
```

Thường không cần rollback migration này vì nó chỉ backfill dữ liệu thiếu.

---

## 7. Lưu Ý Quan Trọng

### File `.env.production` — bắt buộc phải có

File này **không được commit lên Git** (gitignored). Phải tồn tại thủ công trên server.

Các biến bắt buộc:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://vgxpucmwivhlgvlzzkju.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key từ Supabase Dashboard>
SUPABASE_SERVICE_ROLE_KEY=<service role key từ Supabase Dashboard>
NEXTAUTH_SECRET=<random string đủ dài>
NEXTAUTH_URL=http://your-homeserver-ip-or-domain
```

Biến **tùy chọn** (app vẫn chạy nếu thiếu):

```bash
RESEND_API_KEY=<key nếu muốn gửi email>
ZALO_APP_ID=<nếu dùng Zalo integration>
ZALO_APP_SECRET=<nếu dùng Zalo integration>
FACEBOOK_ACCESS_TOKEN=<nếu dùng Facebook integration>
FACEBOOK_VERIFY_TOKEN=<nếu dùng Facebook webhook>
```

**Lưu ý `RESEND_API_KEY`:** Sau fix `ec50034`, thiếu key này sẽ không còn crash app nữa. App chạy bình thường, chỉ tính năng gửi email sẽ không hoạt động.

### Caddy lắng nghe port 80 (không phải 443)

Cấu hình hiện tại dùng HTTP thuần (port 80). Nếu muốn HTTPS, cần cập nhật Caddyfile với domain thật và để Caddy tự lấy cert từ Let's Encrypt.

### Healthcheck tự động

Docker Compose có healthcheck tích hợp: ping `http://localhost:3000/login` mỗi 30 giây. Container tự restart nếu unhealthy quá 5 lần liên tiếp (`restart: unless-stopped`).

### Không chạy `git reset --hard` trên nhánh main khi đang production

Nếu cần rollback khẩn cấp, ưu tiên dùng `git revert` để tạo commit rollback thay vì force reset, tránh mất lịch sử.

---

## 8. Liên Hệ & Tài Nguyên

- **Supabase Dashboard:** https://supabase.com/dashboard/project/vgxpucmwivhlgvlzzkju
- **GitHub Repo:** https://github.com/goonlineenglish/luna-english-crm
- **Logs xem realtime:** `docker compose logs -f luna-crm`
- **Restart nhanh (không rebuild):** `docker compose restart luna-crm`
