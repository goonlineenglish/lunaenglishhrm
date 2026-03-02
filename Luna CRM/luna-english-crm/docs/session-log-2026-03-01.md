# Session Log — 2026-03-01

## Tổng quan

Deploy thành công Luna English CRM lên homeserver sau khi fix nhiều bugs. Phát hiện và xử lý **root cause** quan trọng: cấu trúc git repo lồng trên server.

---

## Bug đã fix & deploy

| # | Bug | Root cause | Fix | Commit |
|---|-----|-----------|-----|--------|
| 1 | Resend crash → toàn bộ server action 500 | `new Resend(key)` ở top-level module, crash khi API key missing | Lazy init `getResend()` | `ec50034` |
| 2 | Edge middleware missing Supabase keys | `NEXT_PUBLIC_*` không được bake vào Edge bundle khi build Docker | Thêm `env` block trong `next.config.ts` | `18dc0cb` |
| 3 | User mới bị gán admin role | Missing default role trong DB trigger | Migration 024 backfill + auth guards | `9dc71c7`, `440aba6` |
| 4 | Kanban drag-drop lỗi "case not found" | DB trigger thiếu `ELSE NULL` | Migration 025 | `e47736b` |
| 5 | Kanban drag-drop lỗi "ON CONFLICT" | Trigger dùng `ON CONFLICT` sai | Migration 026 | `e47736b` |
| 6 | `ensureUserProfile` crash | Thiếu guard check cho SERVICE_ROLE_KEY | Thêm guard | `e47736b` |
| 7 | Form reset error | `QuickAddLeadSheet` null reference | **CHƯA FIX** — bug nhỏ, UI only |

---

## Root cause chính: Cấu trúc git lồng trên server

### Vấn đề
Git repo trên server tại `/opt/luna-crm` có cấu trúc lồng:
- `git ls-tree HEAD` chỉ trả về `.gitignore` + `Luna CRM/`
- Tất cả code thực tế nằm trong `Luna CRM/luna-english-crm/`
- Files ở thư mục gốc (`lib/`, `app/`, `Dockerfile`) là bản sao CŨ, không được git theo dõi
- `git pull` cập nhật thư mục lồng, nhưng Docker build lấy code CŨ từ gốc
- **Kết quả: KHÔNG CÓ FIX NÀO ĐƯỢC DEPLOY KỂ TỪ KHI CÀI SERVER**

### Giải pháp đã thực hiện
1. `docker compose down` + backup `.env.production`
2. `rm -rf /opt/luna-crm` 
3. Fresh `git clone` từ GitHub
4. Restore `.env.production`
5. `Luna CRM/` thêm vào `.dockerignore`
6. Commit `ed2e5ef` xóa nested `Luna CRM/` khỏi git repo
7. Rebuild Docker với env vars đúng
8. Container healthy, logs clean

---

## Trạng thái deploy hiện tại

- **Commit trên server**: `e47736b` (HEAD)
- **Container**: `luna-crm` healthy + `caddy` running
- **URL**: https://crm1.buttercup.edu.vn
- **Docker logs**: Clean — `✓ Ready in 188ms`, no errors
- **Lead tạo mới**: ✅ Hoạt động
- **Kanban drag-drop**: ⚠️ Cần test thủ công (bot tự động không kéo thả được với dnd-kit)

---

## Cấu hình server

- **Máy**: Dell Inspiron 3442 (laptop Ubuntu)
- **CPU**: Intel Core i3 4005U (1.70 GHz, 2 cores)
- **RAM**: 8GB DDR3L (kịch trần)
- **Ổ cứng**: 120GB SSD + 460GB HDD
- **Kết nối**: Tailscale VPN (IP: 100.115.204.15)
- **SSH user**: cuongpham
- **App path**: `/opt/luna-crm`
- **Deploy method**: Docker Compose (thủ công qua SSH)
- **Khuyến nghị**: KHÔNG cài Coolify (RAM không đủ), giữ Docker thủ công

---

## Quy trình deploy đúng (cho lần sau)

```bash
# SSH vào server
ssh cuongpham@100.115.204.15

# Pull code
cd /opt/luna-crm
git pull origin main

# Rebuild với env vars
NEXT_PUBLIC_SUPABASE_URL='https://vgxpucmwivhlgvlzzkju.supabase.co' \
NEXT_PUBLIC_SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZneHB1Y213aXZobGd2bHp6a2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MTU2ODIsImV4cCI6MjA4NzA5MTY4Mn0.Iaeyq3xBCCqRmvFawaO-H9-h4PuQBiQjo8Wl77f2wck' \
docker compose build --no-cache luna-crm

# Restart
docker compose down
docker compose up -d

# Verify
docker ps  # phải healthy
docker logs luna-crm 2>&1  # không có error
```

---

## Việc còn lại (chưa làm)

1. **Fix `QuickAddLeadSheet` reset error** — bug frontend nhỏ, `TypeError: Cannot read properties of null (reading 'reset')`
2. **Test drag-drop thủ công** — user cần tự test trên browser
3. **Thêm RESEND_API_KEY** vào `.env.production` trên server nếu muốn gửi email
4. **Monitoring** — chưa có giải pháp giám sát server/app
