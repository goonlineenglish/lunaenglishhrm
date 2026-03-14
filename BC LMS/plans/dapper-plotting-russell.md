# Plan: Tích hợp Cloudflare R2 cho BC LMS

## Context

BC LMS hiện **không có hạ tầng upload file** — video dùng Google Drive embed (paste URL thủ công), field `materials Json?` trên Lesson chưa bao giờ dùng. User có ~50GB tài liệu (PDF, ảnh, audio) cần upload & phát cho ~50 giáo viên đồng thời.

**Mục tiêu 2 giai đoạn**:
1. **GĐ1 (ngay)**: R2 cho PDF/ảnh/audio + Google Drive cho video (miễn phí)
2. **GĐ2 (sau)**: Upload video lên R2 + stream qua Cloudflare Stream (thay thế Google Drive)

**Chi phí**: GĐ1 ~$0.60/tháng (R2 50GB, $0 egress) | GĐ2 thêm ~$5/tháng (CF Stream Starter: 1000 phút storage, 5000 phút delivery)

---

## Sub-phase A: Infrastructure

### A1. Install AWS SDK
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### A2. Environment Variables
Add to `.env` and `.env.example`:
```
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=bc-lms-materials
```

### A3. Prisma Schema — Add Material model
**File**: `prisma/schema.prisma`
- Remove `materials Json?` from Lesson model
- Add `materials Material[]` relation to Lesson
- Add new Material model:

```prisma
model Material {
  id        String   @id @default(cuid())
  lessonId  String
  lesson    Lesson   @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  filename  String
  r2Key     String   @unique
  mimeType  String
  size      Int
  createdAt DateTime @default(now())

  @@index([lessonId])
  @@map("materials")
}
```

Run: `npx prisma migrate dev --name add-materials-model`

### A4. Create `lib/types/material.ts` (~25 LOC)
- `MaterialItem` type (id, lessonId, filename, r2Key, mimeType, size, createdAt)
- `PresignedUploadResponse` type
- `MaterialActionResult` type

### A5. Create `lib/r2-client.ts` (~20 LOC)
- S3Client singleton (mirrors `lib/prisma.ts` pattern)
- Endpoint: `https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
- Region: `auto`

### A6. Create `lib/services/r2-storage-service.ts` (~120 LOC)
Exports:
- `ALLOWED_MIME_TYPES` — PDF, PNG, JPG, GIF, WEBP, MP3, WAV, OGG (**NO MP4/WEBM — GĐ1 không upload video**)
- `MAX_FILE_SIZE` — 100MB
- `buildR2Key(courseId, lessonId, filename)` → `materials/{courseId}/{lessonId}/{timestamp}-{sanitized}`
- `generateUploadPresignedUrl(r2Key, contentType, expiresIn=600)` → presigned PUT URL
- `generateDownloadPresignedUrl(r2Key, expiresIn=3600)` → presigned GET URL
- `deleteR2Object(r2Key)` → DeleteObjectCommand
- `headR2Object(r2Key)` → HeadObjectCommand — **verify object exists in R2 before DB write**
- `validateFileInput(filename, mimeType, size)` → error string | null

### A7. Update `lib/services/role-permissions-service.ts`
Add 3 permissions — **all material endpoints use `hasPermission()` centrally, no direct role string checks**:
```
'materials:upload': ['ADMIN']
'materials:delete': ['ADMIN']
'materials:download': ['ADMIN', 'MANAGER', 'TEACHER', 'TEACHING_ASSISTANT']
```

**Verify A**: `npx prisma migrate dev` + `npm run build` pass.

---

## Sub-phase B: API Layer

### B1. Create `app/api/upload/presign/route.ts` (~80 LOC)
- POST, check `hasPermission(role, 'materials:upload')`
- Zod body: `{ courseId, lessonId, filename, mimeType, size }`
- Validate file → verify lesson exists & belongs to course & **lesson.isDeleted === false** → buildR2Key → presign
- Response: `{ success: true, data: { uploadUrl, r2Key } }`

### B2. Create `lib/actions/material-actions.ts` (~100 LOC)
- `confirmMaterialUpload({lessonId, courseId, filename, r2Key, mimeType, size})`:
  - Check `hasPermission(role, 'materials:upload')`
  - **Call `headR2Object(r2Key)` to verify file actually exists in R2** before DB write
  - If HeadObject fails → return error, don't create DB record
  - Creates `prisma.material.create()`
- `getMaterialsByLessonId(lessonId)` — returns MaterialItem[]
- `deleteMaterial(id)` — check `hasPermission(role, 'materials:delete')`, deletes from R2 + DB

### B3. Create `app/api/materials/[id]/download/route.ts` (~55 LOC)
- GET, any authenticated user
- Lookup material → **include `lesson: { select: { courseId: true, isDeleted: true } }`**
- **Reject if `lesson.isDeleted === true`** → 404 "Bài học không tồn tại"
- Three-Gate access check (UserProgram + Enrollment + CourseLevel)
- Check `hasPermission(role, 'materials:download')`
- Presign GetObject → return `{ downloadUrl, filename, mimeType }`

### B4. Update `lib/types/course.ts`
- Add `materials?: MaterialItem[]` to `LessonItem` type

### B5. Update `lib/actions/course-actions.ts` (line ~getCourseById)
- Add `include: { materials: true }` to lessons query (1-line change)

**Verify B**: `npm run build` pass. Manual curl test of presign + upload + confirm + download.

---

## Sub-phase C: Admin Upload UI

### C1. Create `components/admin/file-upload-widget.tsx` (~160 LOC)
- Props: `courseId, lessonId, existingMaterials, onMaterialAdded, onMaterialDeleted`
- Drag-and-drop zone + file picker (`<input type="file" multiple>`)
- Client-side validation (type, size)
- Upload flow:
  1. POST `/api/upload/presign` **with `X-CSRF-Token` header** (read from `csrf-token` cookie, same pattern as `markComplete` in `course-player-layout.tsx:40-44`)
  2. PUT to R2 presigned URL (direct, no CSRF needed — external domain)
  3. `confirmMaterialUpload()` server action (Server Actions bypass CSRF via `next-action` header)
- XMLHttpRequest for upload progress bar
- Existing materials list with delete button
- Vietnamese labels: "Kéo thả file vào đây", "Đang tải lên..."

### C2. Create `components/admin/lesson-edit-dialog.tsx` (~80 LOC)
- Extract from lesson-list.tsx: dialog wrapping LessonForm + FileUploadWidget
- Keeps lesson-list.tsx under 200 LOC

### C3. Modify `components/admin/lesson-list.tsx`
- Replace inline edit dialog with `<LessonEditDialog>` component
- Import FileUploadWidget integration

**Verify C**: Admin uploads PDF/audio in lesson edit dialog, files appear in list, delete works.

---

## Sub-phase D: Teacher Download UI

### D1. Create `components/shared/materials-list.tsx` (~70 LOC)
- Props: `materials: MaterialItem[]`
- File type icons (FileText=PDF, Image=images, Music=audio)
- Click → GET `/api/materials/[id]/download` → open presigned URL
- Human-readable file size

### D2. Modify `components/course-player/course-player-layout.tsx` (149 LOC → ~160 LOC)
- Inside `<DrmZone>`, after content div, add:
```tsx
{activeLesson.materials?.length > 0 && (
  <MaterialsList materials={activeLesson.materials} />
)}
```

**Verify D**: Teacher sees materials in course player, clicks to download.

---

## Sub-phase E: Automated Tests

### E1. Create `__tests__/services/r2-storage-service.test.ts` (~60 LOC)
- `validateFileInput`: reject .exe, reject >100MB, accept .pdf, accept .mp3
- `buildR2Key`: correct format, sanitized filename

### E2. Create `__tests__/api/upload-presign.test.ts` (~80 LOC)
- 403 if not ADMIN
- 400 if invalid mime type / oversized
- 404 if lesson not found or lesson.isDeleted
- 200 happy path (mock R2 presign)

### E3. Create `__tests__/api/materials-download.test.ts` (~80 LOC)
- 401 if not authenticated
- 404 if material not found or lesson.isDeleted
- 403 if Three-Gate access denied (non-enrolled teacher)
- 200 happy path

### E4. Create `__tests__/actions/material-actions.test.ts` (~60 LOC)
- confirmMaterialUpload rejects if HeadObject fails (orphan prevention)
- confirmMaterialUpload succeeds after HeadObject passes
- deleteMaterial removes from R2 + DB

**Verify E**: `npm test` — all new + existing 52 tests pass.

---

## Files Summary

### New Files (13)
| File | LOC | Purpose |
|------|-----|---------|
| `lib/r2-client.ts` | ~20 | R2 S3Client singleton |
| `lib/types/material.ts` | ~25 | TypeScript types |
| `lib/services/r2-storage-service.ts` | ~120 | Presign, delete, validate, headObject |
| `lib/actions/material-actions.ts` | ~100 | Server actions CRUD |
| `app/api/upload/presign/route.ts` | ~80 | Presigned upload URL API |
| `app/api/materials/[id]/download/route.ts` | ~55 | Presigned download URL API |
| `components/admin/file-upload-widget.tsx` | ~160 | Upload UI widget |
| `components/admin/lesson-edit-dialog.tsx` | ~80 | Extracted edit dialog |
| `components/shared/materials-list.tsx` | ~70 | Teacher download list |
| `__tests__/services/r2-storage-service.test.ts` | ~60 | Validation tests |
| `__tests__/api/upload-presign.test.ts` | ~80 | Upload API auth/validation tests |
| `__tests__/api/materials-download.test.ts` | ~80 | Download API auth/access tests |
| `__tests__/actions/material-actions.test.ts` | ~60 | HeadObject verification tests |

### Modified Files (6)
| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add Material model, update Lesson relation |
| `lib/services/role-permissions-service.ts` | Add 3 material permissions |
| `lib/types/course.ts` | Add `materials?` to LessonItem |
| `lib/actions/course-actions.ts` | Add `include: { materials: true }` |
| `components/admin/lesson-list.tsx` | Use LessonEditDialog component |
| `components/course-player/course-player-layout.tsx` | Add MaterialsList |

---

## R2 Bucket Setup (Manual, One-time)
In Cloudflare Dashboard:
1. Create bucket `bc-lms-materials`
2. Create API token (Object Read & Write, scoped to bucket)
3. Set CORS:
```json
[{
  "AllowedOrigins": ["https://lms.buttercuplearning.com", "http://localhost:3000"],
  "AllowedMethods": ["GET", "PUT", "HEAD"],
  "AllowedHeaders": ["Content-Type", "Content-Length"],
  "MaxAgeSeconds": 3600
}]
```

---

## Data Flow

```
UPLOAD (Admin):
  FileUploadWidget
    → [Client] POST /api/upload/presign + X-CSRF-Token header
      → [Server] hasPermission(ADMIN) → validate → lesson.isDeleted check → presign
      → { uploadUrl, r2Key }
    → [Client] PUT uploadUrl (client → R2 direct, no CSRF)
    → [Client] confirmMaterialUpload() server action (bypass CSRF via next-action)
      → [Server] headR2Object(r2Key) → verify exists → prisma.material.create()

DOWNLOAD (Teacher):
  MaterialsList → GET /api/materials/[id]/download
    → lesson.isDeleted check → Three-Gate → hasPermission → presign GetObject
    → { downloadUrl } → window.open()

DELETE (Admin):
  FileUploadWidget → deleteMaterial() server action
    → hasPermission(ADMIN) → DeleteObjectCommand (R2) → prisma.material.delete()
```

---

## Verification
1. `npx prisma migrate dev` — materials table created
2. `npm run build` — zero errors after each sub-phase
3. `npm run lint` — passes
4. `npm test` — all new tests + existing 52 tests pass
5. Manual test: admin upload PDF → teacher downloads → admin deletes
6. Reject test: upload .exe → rejected; upload >100MB → rejected
7. Access test: non-enrolled teacher → 403; soft-deleted lesson → 404
8. Orphan test: call confirmMaterialUpload with fake r2Key → rejected (HeadObject fails)

---

## GĐ2: Cloudflare Stream cho Video (Thực hiện sau GĐ1)

> Thay thế Google Drive embed bằng Cloudflare Stream. Admin upload video → CF Stream encodes HLS → adaptive streaming.

### Chi phí
- CF Stream Starter: **$5/tháng** (1,000 phút storage, 5,000 phút delivery)
- 800 phút video → vừa trong gói Starter

### E1. Environment Variables
```
CLOUDFLARE_STREAM_API_TOKEN=
CLOUDFLARE_STREAM_ACCOUNT_ID=
```

### E2. Create `lib/services/cloudflare-stream-service.ts` (~100 LOC)
- `uploadVideoToStream(file)` — upload via CF Stream API (tus protocol hoặc direct upload)
- `getStreamVideoUrl(videoUid)` — return embed URL
- `deleteStreamVideo(videoUid)` — delete from Stream
- `getVideoStatus(videoUid)` — check encoding status

### E3. Update Prisma Schema
- Add `streamVideoUid String?` to Lesson model (CF Stream video ID)
- Keep `videoUrl String?` for backward compat (Google Drive links)

### E4. Update `components/admin/lesson-form.tsx`
- Add video upload input (reuse file-upload-widget pattern)
- Show upload progress + encoding status

### E5. Update `components/course-player/video-player.tsx`
- Priority: `streamVideoUid` → CF Stream iframe embed
- Fallback: `videoUrl` → Google Drive/YouTube embed (backward compat)

### E6. Migration path
1. New lessons → upload to CF Stream
2. Old lessons → keep Google Drive links, migrate gradually
3. Both fields coexist — player picks CF Stream first

**Verify GĐ2**: Admin uploads video → CF Stream encodes → teacher watches HLS → DRM watermark still works
