# Hướng dẫn Apply Migration 014 — Multi-Role RBAC

## Bước 1: Backfill app_metadata.roles (ĐÃ THỰC HIỆN)
✅ Script `scripts/backfill-roles-rest.js` đã chạy thành công.
Tất cả users đã có `roles[]` trong `app_metadata`.

## Bước 2: Apply Migration 014 SQL

**Truy cập Supabase SQL Editor:**
1. Mở: https://supabase.com/dashboard/project/btwwqeemwedtbnskjcem/sql/new
2. Copy nội dung file: `supabase/migrations/014_multi_role_schema_and_rls.sql`
3. Paste vào SQL editor và nhấn **Run**

**File cần chạy:** `supabase/migrations/014_multi_role_schema_and_rls.sql` (711 dòng)

**Nội dung SQL bao gồm:**
- Step 1: ALTER TABLE employees ADD COLUMN roles TEXT[]
- Step 2: CREATE/REPLACE functions: get_user_roles(), user_has_role(), is_global_access(), get_user_role() (backward compat)
- Step 3: DROP tất cả 68 policies cũ
- Step 4: Re-CREATE tất cả policies với user_has_role() pattern

## Kiểm tra sau khi apply

Chạy SQL verify trong editor:
```sql
-- Kiểm tra column roles[] đã được thêm
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'employees' AND column_name IN ('role', 'roles');

-- Kiểm tra functions mới
SELECT proname FROM pg_proc WHERE proname IN ('get_user_roles', 'user_has_role', 'is_global_access');

-- Kiểm tra policies
SELECT count(*) FROM pg_policies WHERE tablename IN ('employees', 'branches', 'payroll_periods');
```

## Lưu ý quan trọng
- Migration có chứa `IF NOT EXISTS` nên an toàn khi chạy lại
- Legacy `get_user_role()` vẫn được giữ (backward compat cho code đang transition)
- Sau khi apply xong, ứng dụng đã có multi-role RBAC hoạt động
