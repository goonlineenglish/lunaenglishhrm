# Hướng dẫn triển khai: Cloudflare R2 cho BC LMS

**Ngày**: 2026-03-03
**Phiên bản**: GĐ1 — Upload PDF/ảnh/audio (không bao gồm video)

---

## Tổng quan thay đổi

Feature mới cho phép Admin upload tài liệu (PDF, ảnh, audio) lên Cloudflare R2 và gắn vào bài học. Giáo viên tải về từ course player.

**Chi phí R2**: ~$0.60/tháng (50GB storage, $0 egress qua Cloudflare)

---

## Bước 1: Tạo R2 Bucket trên Cloudflare

1. Đăng nhập [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Vào **R2 Object Storage** ở sidebar trái
3. Nhấn **Create bucket**
   - Bucket name: `bc-lms-materials`
   - Location: **APAC** (gần Việt Nam nhất)
4. Sau khi tạo bucket, vào tab **Settings** → **CORS Policy** → **Add**:

```json
[
  {
    "AllowedOrigins": [
      "https://lms.buttercuplearning.com",
      "http://localhost:3000",
      "http://localhost:9999"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["Content-Type", "Content-Length"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

5. Nhấn **Save**

---

## Bước 2: Tạo R2 API Token

1. Trong Cloudflare Dashboard → **R2 Object Storage** → **Manage R2 API Tokens**
2. Nhấn **Create API Token**
   - Token name: `bc-lms-r2-access`
   - Permissions: **Object Read & Write**
   - Specify bucket: **bc-lms-materials** (chỉ scope bucket này)
3. Nhấn **Create API Token**
4. **Lưu lại 3 giá trị** (chỉ hiện 1 lần):
   - **Account ID** — hiện trên URL dashboard: `https://dash.cloudflare.com/{ACCOUNT_ID}/r2`
   - **Access Key ID** — chuỗi bắt đầu bằng chữ
   - **Secret Access Key** — chuỗi dài

---

## Bước 3: Cập nhật Environment Variables trên VPS

SSH vào VPS:
```bash
ssh root@<VPS_IP>
cd /opt/bc-lms
```

Thêm 4 biến vào `.env.production`:
```bash
nano .env.production
```

Thêm cuối file:
```env
# Cloudflare R2 Storage
R2_ACCOUNT_ID=<Account ID từ bước 2>
R2_ACCESS_KEY_ID=<Access Key ID từ bước 2>
R2_SECRET_ACCESS_KEY=<Secret Access Key từ bước 2>
R2_BUCKET_NAME=bc-lms-materials
```

Lưu file (`Ctrl+O`, `Enter`, `Ctrl+X`).

---

## Bước 4: Pull code mới & chạy migration

```bash
cd /opt/bc-lms

# Backup database trước
docker-compose -f docker-compose.production.yml exec postgres \
  pg_dump -U bc_lms_user bc_lms > backup-$(date +%Y%m%d-%H%M).sql

# Pull code mới
git pull origin main

# Rebuild Docker image (bao gồm package @aws-sdk/client-s3 mới)
docker-compose -f docker-compose.production.yml build app

# Khởi động lại
docker-compose -f docker-compose.production.yml up -d

# Chạy migration tạo bảng materials
docker-compose -f docker-compose.production.yml exec app \
  npx prisma migrate deploy
```

**Kiểm tra migration thành công**:
```bash
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U bc_lms_user -d bc_lms -c "\dt materials"
```

Kết quả mong đợi:
```
          List of relations
 Schema |   Name    | Type  |    Owner
--------+-----------+-------+-------------
 public | materials | table | bc_lms_user
```

---

## Bước 5: Cập nhật Caddyfile (CSP header)

Mở Caddyfile:
```bash
nano /opt/bc-lms/Caddyfile
```

Tìm dòng `Content-Security-Policy`, thêm domain R2 vào `connect-src`:

**Trước**:
```
connect-src 'self' https:;
```

**Sau** (thay `<ACCOUNT_ID>` bằng Account ID thật):
```
connect-src 'self' https: https://<ACCOUNT_ID>.r2.cloudflarestorage.com;
```

Reload Caddy:
```bash
docker-compose -f docker-compose.production.yml exec caddy caddy reload --config /etc/caddy/Caddyfile
```

---

## Bước 6: Kiểm tra hoạt động

### 6.1 Health check
```bash
curl https://lms.buttercuplearning.com/api/health
# Mong đợi: {"status":"ok","database":"connected",...}
```

### 6.2 Test upload (đăng nhập Admin)

1. Đăng nhập `https://lms.buttercuplearning.com/login` bằng tài khoản Admin
2. Vào **Admin** → **Khóa học** → chọn 1 khóa học → chọn bài học → nhấn icon bút (chỉnh sửa)
3. Cuộn xuống phần **"Tài liệu đính kèm"**
4. Kéo thả file PDF hoặc nhấn để chọn file
5. Chờ progress bar hoàn tất → toast "Đã tải lên: ..."
6. File xuất hiện trong danh sách tài liệu bên dưới

### 6.3 Test download (đăng nhập Teacher)

1. Đăng nhập bằng tài khoản Teacher (đã được enroll vào course)
2. Vào **Khóa học** → chọn bài học vừa upload tài liệu
3. Cuộn xuống phần **"Tài liệu đính kèm"** trong course player
4. Nhấn icon download → file mở trong tab mới

### 6.4 Test bảo mật

- Upload file `.exe` → phải bị từ chối ("Loại file không được hỗ trợ")
- Upload file >100MB → phải bị từ chối ("File quá lớn")
- Teacher không có quyền upload (chỉ Admin)
- Teacher chưa enroll → không download được (403)

---

## Bước 7 (tùy chọn): Tạo migration file nếu chưa có

Nếu migration chưa có trong git, cần tạo trước khi push:

```bash
# Trên máy dev (không phải VPS)
cd "F:\APP ANTIGRAVITY\Tool\BC LMS"
npx prisma migrate dev --name add-materials-model
```

File migration sẽ được tạo tại:
```
prisma/migrations/2026MMDD_add_materials_model/migration.sql
```

Nội dung SQL tự động sinh:
```sql
CREATE TABLE "materials" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "r2Key" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "materials_r2Key_key" ON "materials"("r2Key");
CREATE INDEX "materials_lessonId_idx" ON "materials"("lessonId");

ALTER TABLE "materials" ADD CONSTRAINT "materials_lessonId_fkey"
    FOREIGN KEY ("lessonId") REFERENCES "lessons"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
```

Cũng cần xóa cột `materials` (JSON) cũ khỏi Lesson nếu migration tự detect:
```sql
ALTER TABLE "lessons" DROP COLUMN IF EXISTS "materials";
```

Commit migration file và push:
```bash
git add prisma/migrations/
git commit -m "feat(db): add materials table for R2 file storage"
git push origin main
```

---

## Tóm tắt file mới trong codebase

### File mới (11 code + 2 test)
| File | Mô tả |
|------|--------|
| `lib/r2-client.ts` | S3Client singleton kết nối R2 |
| `lib/types/material.ts` | TypeScript types cho Material |
| `lib/services/r2-storage-service.ts` | Presigned URL, validate, delete, head |
| `lib/actions/material-actions.ts` | Server actions: confirm upload, list, delete |
| `app/api/upload/presign/route.ts` | API tạo presigned upload URL (Admin only) |
| `app/api/materials/[id]/download/route.ts` | API tạo presigned download URL (Three-Gate) |
| `components/admin/file-upload-widget.tsx` | Widget upload drag-and-drop |
| `components/admin/lesson-edit-dialog.tsx` | Dialog chỉnh sửa bài học + upload |
| `components/shared/materials-list.tsx` | Danh sách tải về cho giáo viên |
| `tests/r2-storage-service.test.ts` | 47 test cases |
| `tests/material-permissions.test.ts` | 24 test cases |

### File đã sửa (6)
| File | Thay đổi |
|------|----------|
| `prisma/schema.prisma` | Thêm model Material, relation Lesson→Material |
| `lib/services/role-permissions-service.ts` | +3 permissions: materials:upload/delete/download |
| `lib/types/course.ts` | Thêm `materials?: MaterialItem[]` vào LessonItem |
| `lib/actions/course-actions.ts` | getCourseById include materials |
| `components/admin/lesson-list.tsx` | Dùng LessonEditDialog thay dialog inline |
| `components/course-player/course-player-layout.tsx` | Thêm MaterialsList trong DrmZone |

### Package mới
| Package | Mô tả |
|---------|--------|
| `@aws-sdk/client-s3` | AWS S3 SDK (tương thích R2) |
| `@aws-sdk/s3-request-presigner` | Tạo presigned URL |

---

## Luồng dữ liệu

```
UPLOAD (Admin):
  Browser → POST /api/upload/presign (kiểm tra ADMIN + validate file)
         → Trả về { uploadUrl, r2Key }
  Browser → PUT uploadUrl (upload thẳng lên R2, không qua server)
         → confirmMaterialUpload() server action
         → headR2Object(r2Key) xác nhận file tồn tại
         → prisma.material.create()

DOWNLOAD (Teacher):
  Browser → GET /api/materials/[id]/download
         → Kiểm tra quyền (Three-Gate: UserProgram + Enrollment + CourseLevel)
         → Trả về { downloadUrl } (presigned GET URL, hết hạn sau 1 giờ)
  Browser → window.open(downloadUrl)

DELETE (Admin):
  Browser → deleteMaterial() server action
         → deleteR2Object(r2Key) xóa khỏi R2
         → prisma.material.delete() xóa khỏi DB
```

---

## Xử lý sự cố

### Upload thất bại với lỗi CORS
- Kiểm tra CORS policy trên R2 bucket (Bước 1)
- Đảm bảo `AllowedOrigins` chứa đúng domain production
- Kiểm tra CSP header trong Caddyfile (Bước 5)

### Upload thất bại với lỗi 403
- Kiểm tra R2 API Token còn hiệu lực
- Kiểm tra `R2_ACCESS_KEY_ID` và `R2_SECRET_ACCESS_KEY` đúng
- Kiểm tra bucket name match với `R2_BUCKET_NAME`

### confirmMaterialUpload báo lỗi "File không tồn tại trên R2"
- File chưa upload xong trước khi confirm → thử lại
- Presigned URL đã hết hạn (10 phút) → tải lại trang, upload lại

### Teacher không thấy tài liệu
- Kiểm tra teacher đã được enroll vào course
- Kiểm tra bài học không bị soft-delete
- Kiểm tra `getCourseById` trả về `include: { materials: true }`

### Xóa file trên R2 nhưng DB record vẫn còn
- Lỗi hiếm gặp khi R2 delete thành công nhưng DB delete fail
- Fix thủ công: `DELETE FROM materials WHERE id = '<material_id>';`

---

## GĐ2 (sau): Cloudflare Stream cho Video

Khi cần thay thế Google Drive embed bằng video upload:
- Chi phí: thêm ~$5/tháng (CF Stream Starter: 1000 phút storage, 5000 phút delivery)
- Cần thêm env: `CLOUDFLARE_STREAM_API_TOKEN`, `CLOUDFLARE_STREAM_ACCOUNT_ID`
- Xem chi tiết tại plan: `plans/dapper-plotting-russell.md` → mục "GĐ2"
