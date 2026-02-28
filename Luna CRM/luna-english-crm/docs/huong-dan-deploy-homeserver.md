# Hướng Dẫn Deploy Luna CRM Lên Homeserver

> Server đã cài xong Ubuntu 24.04, Docker, Caddy, Cloudflare Tunnel, Tailscale, UFW, Fail2ban.
> Hướng dẫn này chỉ còn phần **cài ứng dụng Luna CRM**.

---

## Tổng quan

Sau khi làm xong hướng dẫn này, Luna CRM sẽ chạy trên server của bạn. Mọi người truy cập qua tên miền HTTPS. Kiến trúc:

```
Người dùng
   │
   ▼
Cloudflare Tunnel (đã cài, đang chạy)
   │
   ▼
Caddy (reverse proxy, trong Docker, port 80)
   │
   ▼
Luna CRM (ứng dụng Next.js, trong Docker, port 3000)
   │
   ▼
Supabase Cloud (database, ở Singapore)
```

**Thời gian còn lại:** ~30–60 phút

---

## Chuẩn bị sẵn trước khi bắt đầu

Mở trang [supabase.com](https://supabase.com) → chọn project Luna → vào **Settings → API**, copy 3 giá trị sau ra notepad:

| Tên | Ở đâu | Ví dụ |
|-----|-------|-------|
| **Project URL** | Settings → API → Project URL | `https://vgxpucmwivhlgvlzzkju.supabase.co` |
| **anon public key** | Settings → API → Project API keys → `anon public` | chuỗi dài bắt đầu `eyJ...` |
| **service_role key** | Settings → API → Project API keys → `service_role` | chuỗi dài bắt đầu `eyJ...` |

> **service_role key** rất quan trọng — thiếu key này thì các tác vụ tự động (cron) sẽ lỗi 500.

---

## Bước 1 — Tải code về server

SSH vào server (qua Tailscale hoặc trực tiếp), rồi chạy:

```bash
cd /opt
sudo git clone https://github.com/goonlineenglish/luna-english-crm.git luna-crm
sudo chown -R $(id -un):$(id -un) /opt/luna-crm
cd /opt/luna-crm
```

**Giải thích:** Tải code từ GitHub về thư mục `/opt/luna-crm` trên server, và cho tài khoản của bạn quyền sở hữu.

---

## Bước 2 — Tạo file chứa mật khẩu và key

```bash
cp .env.production.template .env.production
nano .env.production
```

File sẽ mở ra, điền vào **4 dòng bắt buộc** (các dòng khác để trống cũng được):

```
NEXT_PUBLIC_SUPABASE_URL=https://vgxpucmwivhlgvlzzkju.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dán-anon-key-vào-đây
SUPABASE_SERVICE_ROLE_KEY=dán-service-role-key-vào-đây
CRON_SECRET=sẽ-tạo-ở-bước-dưới
```

Để tạo CRON_SECRET, **mở thêm 1 tab terminal** (hoặc bấm Ctrl+Z tạm dừng nano) rồi chạy:

```bash
openssl rand -hex 32
```

Kết quả là chuỗi ngẫu nhiên kiểu `a3f7b2c1d9e8...` — copy chuỗi đó dán vào dòng `CRON_SECRET=`.

Lưu file: **Ctrl+O** → **Enter** → **Ctrl+X**

Khóa file lại (chỉ bạn đọc được):

```bash
chmod 600 .env.production
```

---

## Bước 3 — Điền tên miền vào Caddy

Thay `your-domain.com` bằng tên miền thật mà bạn đã cấu hình trên Cloudflare:

```bash
sed -i 's/your-domain.com/ten-mien-cua-ban.com/g' Caddyfile
```

> **Lưu ý:** Thay `ten-mien-cua-ban.com` bằng domain thực, ví dụ `crm.gooe.vn`.

Kiểm tra:

```bash
cat Caddyfile
```

Dòng đầu tiên phải hiện đúng tên miền của bạn (không còn `your-domain.com`).

---

## Bước 4 — Cấu hình Caddy cho Cloudflare Tunnel

Vì bạn dùng **Cloudflare Tunnel** (không mở port 80/443 trực tiếp), Caddy không cần tự xin chứng chỉ SSL — Cloudflare lo phần đó rồi. Cần chỉnh Caddyfile để Caddy chỉ nhận traffic nội bộ:

```bash
nano Caddyfile
```

**Thay toàn bộ nội dung** bằng đoạn sau (nhớ đổi `ten-mien-cua-ban.com` thành domain thật):

```
:80 {
    reverse_proxy luna-crm:3000

    # Nén dữ liệu gửi đi cho nhanh hơn
    encode gzip zstd

    # Header bảo mật
    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        Referrer-Policy strict-origin-when-cross-origin
    }

    # Log truy cập
    log {
        output file /data/access.log {
            roll_size 10mb
            roll_keep 3
        }
    }
}
```

Lưu: **Ctrl+O** → **Enter** → **Ctrl+X**

**Giải thích:** Caddy giờ lắng nghe port 80 (HTTP thuần). Cloudflare Tunnel kết nối vào port 80 này và lo phần HTTPS ở phía Cloudflare. Bỏ `Strict-Transport-Security` header vì Cloudflare quản lý SSL.

---

## Bước 5 — Cấu hình Cloudflare Tunnel trỏ vào Caddy

Mở file config của Cloudflare Tunnel trên server:

```bash
nano ~/.cloudflared/config.yml
```

Đảm bảo có dòng trỏ domain về port 80 của Caddy:

```yaml
ingress:
  - hostname: ten-mien-cua-ban.com
    service: http://localhost:80
  - service: http_status:404
```

> Nếu bạn đã cấu hình qua Cloudflare Dashboard (Zero Trust → Tunnels) thì bỏ qua bước này — config sẽ tự kéo từ cloud.

Restart tunnel sau khi sửa:

```bash
sudo systemctl restart cloudflared
```

---

## Bước 6 — Build và khởi động Luna CRM

```bash
cd /opt/luna-crm
docker compose build
```

> Lần đầu build mất khoảng **5–15 phút** tùy tốc độ mạng và CPU. Chờ đến khi thấy dòng `exporting to image` và không có lỗi đỏ.

Khởi động:

```bash
docker compose up -d
```

Xem log để kiểm tra lỗi:

```bash
docker compose logs -f
```

Nhấn **Ctrl+C** để thoát xem log (app vẫn chạy).

---

## Bước 7 — Kiểm tra app đang chạy

### 7.1 — Kiểm tra container

```bash
docker compose ps
```

Phải thấy 2 dòng: `luna-crm` và `caddy`, trạng thái **healthy** hoặc **running**.

### 7.2 — Kiểm tra nội bộ

```bash
curl -s http://localhost:3000/login | head -5
```

Phải thấy HTML (có chữ `<html` hoặc `<head`). Nếu thấy `Connection refused` → app chưa khởi động xong, chờ 30 giây rồi thử lại.

### 7.3 — Kiểm tra từ bên ngoài

Mở trình duyệt **trên điện thoại hoặc máy khác**, vào:

```
https://ten-mien-cua-ban.com/login
```

Phải thấy trang đăng nhập Luna CRM với ổ khóa xanh.

> **Nếu không mở được:**
> 1. Kiểm tra Cloudflare Tunnel đang chạy: `sudo systemctl status cloudflared`
> 2. Kiểm tra DNS trên Cloudflare Dashboard đã trỏ đúng domain
> 3. Xem log Caddy: `docker compose logs caddy --tail 30`

---

## Bước 8 — Cài tác vụ tự động (cron)

Đây là 4 tác vụ chạy ngầm theo lịch:

| Tác vụ | Chạy mỗi | Làm gì |
|--------|----------|--------|
| Nhắc nhở quá hạn | 15 phút | Kiểm tra lead nào cần follow-up |
| Gửi tin nhắn | 5 phút | Gửi tin nhắn Zalo/Facebook đang chờ |
| Làm mới token | 6 giờ | Refresh token Zalo/Facebook trước khi hết hạn |
| Báo cáo tuần | Thứ 2, 8h sáng | Tạo báo cáo tổng hợp tuần |

### Cài đặt:

```bash
cd /opt/luna-crm
chmod +x deploy/cron-setup.sh deploy/cron-health-check.sh
./deploy/cron-setup.sh /opt/luna-crm
```

Kiểm tra:

```bash
crontab -l
```

Phải thấy 4 dòng lịch (bắt đầu bằng `*/5`, `*/15`, `0 */6`, `0 1`).

### Cài log rotation (để file log không đầy ổ cứng):

```bash
sudo cp deploy/logrotate-luna-crm.conf /etc/logrotate.d/luna-crm
sudo sed -i "s/<deploy_user>/$(id -un)/g" /etc/logrotate.d/luna-crm
```

Kiểm tra:

```bash
sudo cat /etc/logrotate.d/luna-crm
```

Phải thấy tên user của bạn (ví dụ `ubuntu`) thay cho `<deploy_user>`.

### Giới hạn dung lượng log Docker:

```bash
sudo tee /etc/docker/daemon.json > /dev/null <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
sudo systemctl restart docker

# Khởi động lại app sau khi restart Docker
cd /opt/luna-crm
docker compose up -d
```

---

## Bước 9 — Test các tác vụ tự động

```bash
CRON_SECRET=$(grep '^CRON_SECRET=' /opt/luna-crm/.env.production | cut -d'=' -f2-)

curl -sf -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/check-overdue-reminders
echo ""
curl -sf -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/process-message-queue
echo ""
curl -sf -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/refresh-tokens
echo ""
curl -sf -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/weekly-report
echo ""
```

Mỗi lệnh phải trả về JSON kiểu `{"message":"..."}`. Nếu không có gì hiện → kiểm tra lại CRON_SECRET ở Bước 2.

---

## Bước 10 — Đăng nhập lần đầu

Mở trình duyệt, vào `https://ten-mien-cua-ban.com/login`.

Đăng nhập bằng tài khoản admin đã tạo trên **Supabase Dashboard → Authentication → Users**.

Sau khi vào, kiểm tra:
- Pipeline Kanban hiển thị dữ liệu (các cột lead)
- Sidebar bên trái có đầy đủ menu

---

## Checklist cuối cùng

Đánh dấu từng mục:

- [ ] Trang login mở được qua HTTPS (ổ khóa xanh)
- [ ] Đăng nhập thành công
- [ ] Kanban board hiển thị leads
- [ ] `docker compose ps` → 2 container healthy
- [ ] `crontab -l` → 4 dòng lịch
- [ ] 4 lệnh curl ở Bước 9 đều trả về JSON
- [ ] Tắt nguồn server, bật lại → app tự khởi động (chờ 2–3 phút rồi thử truy cập)

---

## Lệnh hay dùng hàng ngày

```bash
cd /opt/luna-crm

# === CẬP NHẬT APP KHI CÓ CODE MỚI ===
git pull
docker compose build
docker compose up -d

# === XEM LOG ===
docker compose logs luna-crm --tail 100     # log app
docker compose logs caddy --tail 50         # log Caddy

# === KHỞI ĐỘNG LẠI ===
docker compose restart luna-crm             # chỉ restart app
docker compose down && docker compose up -d # restart toàn bộ

# === KIỂM TRA SỨC KHỎE ===
docker compose ps                           # trạng thái container
docker stats --no-stream                    # RAM/CPU đang dùng
df -h                                       # ổ cứng còn bao nhiêu
./deploy/cron-health-check.sh               # kiểm tra tổng thể

# === DỌN DẸP (khi ổ cứng gần đầy) ===
docker image prune -f                       # xóa image cũ
docker builder prune -f                     # xóa cache build
```

---

## Xử lý sự cố

### App không mở được từ bên ngoài
1. Kiểm tra Cloudflare Tunnel: `sudo systemctl status cloudflared`
2. Kiểm tra container: `docker compose ps`
3. Xem log: `docker compose logs caddy --tail 30`

### Trang trắng hoặc lỗi
```bash
docker compose logs luna-crm --tail 50
```
Tìm dòng màu đỏ → thường do thiếu biến trong `.env.production`.

### Container restart liên tục
```bash
docker inspect luna-crm --format='{{.State.ExitCode}}'
```
- **137** = hết RAM → tắt bớt ứng dụng khác hoặc restart server
- **1** = lỗi code → xem log

### Quên mật khẩu admin
Vào **Supabase Dashboard → Authentication → Users** → tìm user → Reset Password.

---

## Bảo trì hàng tháng

```bash
cd /opt/luna-crm

# Cập nhật Ubuntu
sudo apt update && sudo apt upgrade -y

# Dọn Docker
docker image prune -f
docker builder prune -f

# Kiểm tra lỗi gần đây
docker compose logs luna-crm --since 720h | grep -i "error" | tail -20
```
