-- ============================================================
-- Luna HRM Cleanup Test Data Script
-- Xóa toàn bộ test data, giữ lại:
--   1. Branch: CS Tân Mai (00000000-0000-0000-0000-000000000001)
--   2. Admin Employee: cuongpham.work@gmail.com
--   3. Schema tables & RLS policies (không bị xóa)
-- ============================================================
-- IMPORTANT: Run này trong Supabase SQL Editor
-- Đảm bảo RLS disabled (SQL Editor tự động disable cho admin)
-- ============================================================

-- Step 1: Xóa dữ liệu transactional (không có FK từ bảng khác)
-- ============================================================
DELETE FROM audit_logs;
DELETE FROM evaluation_scores;
DELETE FROM employee_evaluations;
DELETE FROM evaluation_criteria;
DELETE FROM evaluation_templates;
DELETE FROM evaluation_periods;
DELETE FROM kpi_evaluations;
DELETE FROM employee_weekly_notes;
DELETE FROM attendance;
DELETE FROM office_attendance;
DELETE FROM attendance_locks;
DELETE FROM payslips;
DELETE FROM payroll_periods;
DELETE FROM salary_components;
DELETE FROM employee_notes;

-- Step 2: Xóa class schedules (trước vì employees FK)
-- ============================================================
DELETE FROM class_schedules;

-- Step 3: Xóa tất cả employees EXCEPT admin
-- ============================================================
-- Admin UUID: 10000000-0000-0000-0000-000000000001
DELETE FROM employees
 WHERE id != '10000000-0000-0000-0000-000000000001';

-- Step 4: Xóa branch CS Quận 1, giữ lại CS Tân Mai
-- ============================================================
-- CS Tân Mai: 00000000-0000-0000-0000-000000000001
-- CS Quận 1: 00000000-0000-0000-0000-000000000002
DELETE FROM branches
 WHERE id != '00000000-0000-0000-0000-000000000001';

-- Step 5: Update admin employee email thành cuongpham.work@gmail.com
-- ============================================================
UPDATE employees
   SET email = 'cuongpham.work@gmail.com'
 WHERE id = '10000000-0000-0000-0000-000000000001';

-- Step 6: IMPORTANT - Update Supabase auth.users email
-- ============================================================
-- This requires Supabase Admin Panel or Service Role key
-- Nếu chạy script này qua SQL Editor, bước này skip
-- Chạy sau via Supabase Admin API:
--   POST /auth/v1/admin/users/10000000-0000-0000-0000-000000000001
--   Body: { "email": "cuongpham.work@gmail.com" }
--
-- Hoặc create auth user mới qua Supabase Dashboard:
--   Auth → Users → Add User
--   Email: cuongpham.work@gmail.com
--   Password: (tự chọn hoặc random, rồi reset)
--   app_metadata: {"role":"admin","branch_id":"00000000-0000-0000-0000-000000000001"}
--
-- THEN update employees record nếu UUID khác:
-- UPDATE employees SET id = '<new-auth-uuid>'
--  WHERE id = '10000000-0000-0000-0000-000000000001';

-- ============================================================
-- VERIFY CLEANUP — Run these queries to confirm all data removed
-- ============================================================
-- SELECT COUNT(*) AS total_employees FROM employees;        -- Expected: 1
-- SELECT COUNT(*) AS total_branches FROM branches;          -- Expected: 1
-- SELECT COUNT(*) AS total_classes FROM class_schedules;    -- Expected: 0
-- SELECT COUNT(*) AS total_attendance FROM attendance;      -- Expected: 0
-- SELECT COUNT(*) AS office_attendance FROM office_attendance; -- Expected: 0
-- SELECT COUNT(*) AS total_payslips FROM payslips;          -- Expected: 0
-- SELECT COUNT(*) AS total_payroll_periods FROM payroll_periods; -- Expected: 0
-- SELECT COUNT(*) AS kpi_count FROM kpi_evaluations;        -- Expected: 0
-- SELECT COUNT(*) AS notes_count FROM employee_weekly_notes; -- Expected: 0
-- SELECT * FROM employees WHERE id = '10000000-0000-0000-0000-000000000001';
-- Expected: admin@luna-hrm.local → cuongpham.work@gmail.com
