# Luna HRM — Cleanup Test Data

**Mục đích:** Xóa toàn bộ test data, giữ lại chỉ tài khoản admin duy nhất `cuongpham.work@gmail.com`.

---

## ✅ Các bước thực thi

### Bước 1: Chạy SQL cleanup script
**Location:** `supabase/cleanup-test-data.sql`

1. Mở Supabase Dashboard: https://supabase.com/dashboard/project/btwwqeemwedtbnskjcem
2. Chọn tab **SQL Editor** (hoặc tạo New Query)
3. Copy toàn bộ nội dung từ file `cleanup-test-data.sql`
4. Paste vào SQL Editor
5. Nhấn **RUN** (nếu có popup "Confirm?", chọn Yes)
6. Chờ execute xong (~2-3 giây)

**Kết quả:**
- ✅ Tất cả employees bị xóa (trừ admin UUID: `10000000-0000-0000-0000-000000000001`)
- ✅ CS Quận 1 bị xóa, giữ lại CS Tân Mai
- ✅ Tất cả class schedules, attendance, payroll bị xóa
- ✅ Admin employee email cập nhật thành `cuongpham.work@gmail.com` trong bảng `employees`

---

### Bước 2: Cập nhật Supabase auth.users

**Tùy chọn A: Tạo auth user MỚI** (khuyến nghị)

1. Supabase Dashboard → **Authentication** → **Users**
2. Nhấn **Add user** (nút dương lên góc phải)
3. Điền:
   - **Email:** `cuongpham.work@gmail.com`
   - **Password:** Đặt password tạm (có thể reset sau)
   - **Auto confirm user:** ☑️ (Tick)
4. Scroll xuống **Additional fields** (nếu có)
5. Nhấn **Save**
6. Copy **User UUID** từ bảng users (cột User ID)

Ví dụ nếu UUID mới là `a1234567-89ab-cdef-0123-456789abcdef`:
```sql
UPDATE employees
   SET id = 'a1234567-89ab-cdef-0123-456789abcdef'
 WHERE id = '10000000-0000-0000-0000-000000000001';
```

Chạy SQL này trong SQL Editor để update `employees.id` match auth user UUID.

**Tùy chọn B: Rename email của auth user hiện tại**

1. Supabase Dashboard → **Authentication** → **Users**
2. Tìm user UUID `10000000-0000-0000-0000-000000000001` (admin)
3. Nhấn vào user row để open panel chi tiết
4. Tìm **Email** field, nhấn edit (icon pencil)
5. Đổi email thành `cuongpham.work@gmail.com`
6. Nhấn **Save**

**LƯU Ý:** Tùy chọn A an toàn hơn vì không touch existing auth account. Dùng Tùy chọn B nếu bạn chắc chắn.

---

### Bước 3: Cập nhật app_metadata (Role + Branch)

**Supabase Dashboard** → **Authentication** → **Users**

1. Tìm auth user `cuongpham.work@gmail.com`
2. Nhấn vào row để open panel
3. Scroll xuống section **User Details**
4. Tìm field **app_metadata** (JSON format)
5. Cập nhật thành:
```json
{
  "role": "admin",
  "branch_id": "00000000-0000-0000-0000-000000000001"
}
```
6. Nhấn **Save** / **Update**

**Hoặc chạy SQL** (trong SQL Editor):
```sql
UPDATE auth.users
   SET raw_app_meta_data = jsonb_build_object(
     'role', 'admin',
     'branch_id', '00000000-0000-0000-0000-000000000001'
   )
 WHERE email = 'cuongpham.work@gmail.com';
```

---

### Bước 4: Verify cleanup

**Chạy verification queries trong SQL Editor:**

```sql
-- Verify employees: phải là 1 admin duy nhất
SELECT id, full_name, email, role FROM employees;
-- Expected: 1 row (admin, cuongpham.work@gmail.com)

-- Verify branches: phải là 1 branch duy nhất
SELECT id, name FROM branches;
-- Expected: 1 row (CS Tân Mai)

-- Verify no test data
SELECT COUNT(*) AS class_count FROM class_schedules;         -- Expected: 0
SELECT COUNT(*) AS attendance_count FROM attendance;         -- Expected: 0
SELECT COUNT(*) AS office_attendance_count FROM office_attendance; -- Expected: 0
SELECT COUNT(*) AS payslip_count FROM payslips;              -- Expected: 0
SELECT COUNT(*) AS payroll_period_count FROM payroll_periods; -- Expected: 0
SELECT COUNT(*) AS kpi_count FROM kpi_evaluations;           -- Expected: 0
SELECT COUNT(*) AS notes_count FROM employee_weekly_notes;   -- Expected: 0
SELECT COUNT(*) AS eval_count FROM employee_evaluations;     -- Expected: 0

-- Verify auth user
SELECT id, email, raw_app_meta_data FROM auth.users
 WHERE email = 'cuongpham.work@gmail.com';
-- Expected: 1 row with role=admin, branch_id=00000000-0000-0000-0000-000000000001
```

---

## 🔧 Troubleshooting

### ❌ Error: "permission denied" hoặc "RLS policy denies access"
→ Đảm bảo đang dùng **SQL Editor** (Supabase auto-disable RLS cho SQL Editor)
→ KHÔNG dùng app/client code để chạy delete queries

### ❌ Error: "FK constraint violated"
→ Script đã handle order deletion đúng. Nếu lỗi, run lại từ đầu. Backup database nếu cần.

### ❌ App login thất bại sau cleanup
→ Check:
  1. Auth user email = `cuongpham.work@gmail.com` ✓
  2. Employee record có email = `cuongpham.work@gmail.com` ✓
  3. auth.users.id = employees.id ✓
  4. app_metadata.role = 'admin' ✓
  5. app_metadata.branch_id = '00000000-0000-0000-0000-000000000001' ✓

---

## 📋 Summary

**Trước cleanup:**
- 21 employees, 2 branches, 10 classes, ~100+ records

**Sau cleanup:**
- ✅ 1 admin employee (cuongpham.work@gmail.com)
- ✅ 1 branch (CS Tân Mai)
- ✅ 0 test data (classes, attendance, payroll, kpi, notes)
- ✅ Schema intact, RLS policies intact

**Dev environment:** Ready for fresh development/testing
**Production:** Safe to keep Supabase project as-is
